const fs = require('fs'), path = require('path');
const yaml = require('js-yaml');
const parser = require('./parser.js');
const utils = require('./utils.js');
const writer = require('./writer.js');

let extNodeIdTracker = 1;
const humanGeneIdSet = new Set();
const externalIdDBMap = {};
const PMIDSset = new Set();
let instructions = [];
let dropIndexes = false;
let prefix = '' ;
let outputPath = '';
let outDir = './data';


const parseModelFiles = (modelDir) => {
  // find the yaml in the folder
  yamlFile = utils.getFile(modelDir, /.*[.](yaml|yml)$/);
  if (!yamlFile) {
    throw new Error("yaml file not found in path ", modelDir);
  }

  const [ metadata, metabolites, reactions, genes, compartments ] = yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
  const metadataSection = metadata.metaData || metadata.metadata;
  const model = utils.toLabelCase(metadataSection.short_name);
  // console.log("model=", model);
  const version = `V${metadataSection.version.replace(/\./g, '_')}`;
  const isHuman = metadataSection.short_name === 'Human-GEM';

  prefix = `${model}${version}`;
  outputPath = `${outDir}/${prefix}.`;

  content = { // reformat object as proper key:value objects, rename/add/remove keys
    compartmentalizedMetabolite: utils.reformatCompartmentalizedMetaboliteObjets(metabolites.metabolites),
    reaction: utils.reformatReactionObjets(reactions.reactions),
    gene: utils.reformatGeneObjets(genes.genes),
    compartment: utils.reformatCompartmentObjets(compartments.compartments),
  }

  const componentIdDict = {}; // store for each type of component the key  Id <-> element
  // use to filter out annotation/external ids for components not in the model and to add missing information
  // extracted from these annotation files such as description, etc...
  Object.keys(content).forEach((k) => {
    componentIdDict[k] = Object.fromEntries(content[k].map(e => [e[`${k}Id`], e]));
  });

  if (isHuman) {
    Object.keys(componentIdDict.gene).forEach((geneId) => {
      humanGeneIdSet.add(geneId);
    });
  }

  // subsystems are not a section in the yaml file, but are extracted from the reactions info
  content.subsystem = [];
  componentIdDict.subsystem = {};
  content.reaction.forEach((r) => {
    r.subsystems.forEach((name) => {
      const id = utils.idfyString(name);
      const subsystemObject = { subsystemId: id, name }; // TODO add 'description' key
      if (!(id in componentIdDict.subsystem)) {
        content.subsystem.push(subsystemObject);
        componentIdDict.subsystem[id] = subsystemObject;
      };
    });
  });

  // ========================================================================
  // SVG mapping file
  const svgNodes = [];
  ['compartment', 'subsystem', 'custom'].forEach((component) => {
    parser.createComponentSVGMapFile(component, outputPath, svgNodes, modelDir);
  });

  // write svgMaps file
  writer.writeSvgCSV(svgNodes, outputPath);

  // ========================================================================
  // external IDs and annotation
  // extract EC code and PMID from YAML file
  parser.createPMIDFile(PMIDSset, componentIdDict, outputPath);

  // extract information from gene annotation file
  parser.extractGeneAnnotation(componentIdDict, modelDir);

  // extract description subsystem annotation file
  // TODO or remove annotation file

  // ========================================================================
  // parse External IDs files
  const externalIdNodes = [];

  ['reaction', 'metabolite', 'gene', 'subsystem'].forEach((component) => {
    extNodeIdTracker = parser.createComponentExternalDbFile(externalIdNodes, externalIdDBMap,
      extNodeIdTracker, component, componentIdDict, modelDir, outputPath);
  });

  // write the externalDbs file
  writer.writeExternalDbCSV(externalIdNodes, outputPath);

  // ========================================================================
  // write main nodes relationships files
  writer.writeMetaboliteCompartmentCSV(content, outputPath);

  // ========================================================================
  // write metabolite-compartmentalizedMetabolite relationships
  // generate unique metabolite
  // keep only distinct metabolite (non-compartmentalize) and use the name to generate IDs
  let hm = {}
  const uniqueCompartmentalizedMap = {}
  content.compartmentalizedMetabolite.forEach((m) => {
    parser.getUniqueCompartmentlizedMap(m, hm, uniqueCompartmentalizedMap);
  })

  const uniqueMetDict = {};
  const uniqueMetabolites = [];
  content.compartmentalizedMetabolite.forEach((m) => {
    parser.getUniqueMetabolite(m, uniqueCompartmentalizedMap, uniqueMetDict, uniqueMetabolites);
  })

  // create compartmentalizedMetabolite file
  writer.writeMetaboliteCSV(content, outputPath);

  // ========================================================================
  // extract information from metabolite annotation file
  // METABOLITES.tsv has been removed for the format, and this file is actually
  // empty in the old format

  // ========================================================================
  // CM-M relationships
  writer.writeMetaboliteMetaboliteRelCSV(content, uniqueCompartmentalizedMap, outputPath);

  // delete compartmentlizedMetabolites, add unique metabolites
  content.metabolite = uniqueMetabolites;
  delete content.compartmentalizedMetabolite;

  // write reactants-reaction, reaction-products, reaction-genes, reaction-susbsystems relationships files
  const [reactionReactantRecords, reactionProductRecords, reactionGeneRecords, reactionSubsystemRecords] = utils.getReactionRel(content);
  writer.writeRRCSV(reactionReactantRecords, outputPath);
  writer.writeRPCSV(reactionProductRecords, outputPath);
  writer.writeRGCSV(reactionGeneRecords, outputPath);
  writer.writeRSCSV(reactionSubsystemRecords, outputPath);


  // ========================================================================
  // write nodes files
  Object.keys(content).forEach((k) => {
    const elements = content[k];
    writer.writeComponentCSV(content, k, outputPath);
    writer.writeComponentStateCSV(content, k, outputPath);
  });

  // TODO generate instructions more dynamically
  instructions = parser.getModelCypherInstructions(prefix, dropIndexes, model, version, instructions);
};

// argument parsing
const args = [];
try {
  for (let i = 0; i < process.argv.length; i += 1) {
    if (process.argv[i] === "--reset-db") {
      dropIndexes = true;
    } else {
      args.push(process.argv[i]);
    }
  }
  inputDir = args[2] + '/integrated-models';
} catch {
  console.log("Usage: yarn start input_dir");
  console.log("Usage: yarn start input_dir --reset-db");
  return;
}

if (!fs.existsSync(`${outDir}`)){
  fs.mkdirSync(`${outDir}`);
}

// main procedure
try {
  const intputDirFiles = fs.readdirSync(inputDir);
  for(let i = 0; i < intputDirFiles.length; i++) {
    const filePath = path.join(inputDir, intputDirFiles[i]);
    const stat = fs.lstatSync(filePath);
    if (stat.isDirectory() && intputDirFiles[i][0] != '.') {
      parseModelFiles(filePath);
    }
  }
  instructions = parser.getRemainCyperInstructions(instructions);
} catch (e) {
  if (e.mark) {
    // avoid to print the whole yaml into console
    e.mark.buffer = '';
  }
  console.log(e);
  return;
}

// write cyper intructions to file
writer.writeCyperFile(instructions, outDir);

// ========================================================================
// write a smaller version of the hpa rna levels file, to send to the frontend
writer.writeHpaRnaJson(humanGeneIdSet, inputDir, outDir);
