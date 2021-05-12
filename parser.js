const yaml = require('js-yaml');
const fs = require('fs'), path = require('path');
const { dbnameDict } = require('./var.js');
const utils = require('./utils.js');
const writer = require('./writer.js');

const extractInfoFromYaml = (yamlFile) => {
  const [ metadata, metabolites, reactions, genes, compartments ] = yaml.safeLoad(fs.readFileSync(yamlFile, 'utf8'));
  const metadataSection = metadata.metaData || metadata.metadata;
  const model = utils.toLabelCase(metadataSection.short_name);
  const version = `V${metadataSection.version.replace(/\./g, '_')}`;
  const isHuman = metadataSection.short_name === 'Human-GEM';
  return [metadata, metabolites, reactions, genes, compartments, metadataSection, model, version, isHuman];
}

const createComponentSVGMapFile = (component, outputPath, svgNodes, modelDir) => {
  const filename = `${component}SVG.tsv.plain`;
  const mappingFile = utils.getFile(modelDir, filename);
  const isCustom = component === 'custom';

  let svgRels = [];
  if (mappingFile) {
    let lines = fs.readFileSync(mappingFile, 
          { encoding: 'utf8', flag: 'r' }).split('\n').filter(Boolean);
    const filenameSet = new Set(); // check uniqness of values in the file
    for (let i = 0; i < lines.length; i++) {
      if (lines[i][0] == '#' || lines[i][0] == '@') {
        continue;
      }

      let componentName, mapName, mapFilename;

      const columns = lines[i].split('\t').map(e => e.trim());
      if (isCustom) {
        [ mapName, mapFilename ] = columns;
      } else {
        [ componentName, mapName, mapFilename ] = columns;
      }

      if (componentName && !content[component].map(e => e.name).includes(componentName)) {
        throw new Error(`${component} "${componentName}" does not exist in the model "${metadataSection.short_name}"`);
      }

      if (filenameSet.has(mapFilename)) {
        throw new Error(`map ${mapFilename} can only be linked to one ${component} in the model "${metadataSection.short_name}"`);
      }
      filenameSet.add(mapFilename)

      if (!/^[a-z0-9_]+[.]svg$/.test(mapFilename)) {
        throw new Error(`map "${mapFilename}" referenced by ${metadataSection.short_name}/${filename} is invalid`);
      }
      svgNodes.push({ id: mapFilename.split('.')[0], filename: mapFilename, customName: mapName });

      if (componentName) {
        svgRels.push({
          [`${component}Id`]: utils.idfyString(componentName),
          svgMapId: mapFilename.split('.')[0],
        });
      }
    }
  } else {
    console.log(`Warning: cannot find mappingfile ${filename} in path`, modelDir);
  }

  // write the associated file
  writer.writeComponentSvgCSV(svgRels, outputPath, component);
};

const createPMIDFile = (PMIDSset, componentIdDict, outputPath) => {
  const reactionPMID = [];
  const PMIDs = [];
  for (const reactionId in componentIdDict.reaction) {
    if (reactionId.match('^HMR_')) {
      const ECList = componentIdDict.reaction[reactionId].ec;
      const PMIDList = componentIdDict.reaction[reactionId].references;
      if (PMIDList) {
        PMIDList.split(';').forEach((pubmedReferenceId) => {
          if (pubmedReferenceId.match('^PMID')) {
            pubmedReferenceId = pubmedReferenceId.replace(/PMID:*/g, '');
            // console.log(pubmedReferenceId);
            reactionPMID.push({ reactionId, pubmedReferenceId });
            if (!PMIDSset.has(pubmedReferenceId)) {
              PMIDs.push(pubmedReferenceId);
              PMIDSset.add(pubmedReferenceId);
            }
          }
        });
      }
    }
  }
  // create pubmedReferences file
  writer.writePMIDCSV(PMIDs, outputPath);

  // write reaction pubmed reference file
  writer.writeReactionPMIDCSV(reactionPMID, outputPath);

};

const extractGeneAnnotation = (componentIdDict, modelDir) => {
  const geneAnnoFile = utils.getFile(modelDir, /genes-new[.]tsv$/);
  if (!geneAnnoFile) {
    console.log("Warning: cannot find gene annotation file genes-new.tsv in path", modelDir);
  } else {
    // TODO use one of the csv parsing lib (sync)
    lines = fs.readFileSync(geneAnnoFile, 
              { encoding: 'utf8', flag: 'r' }).split('\n').filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (lines[i][0] == '#' || lines[i][0] == '@') {
        continue;
      }
      // thefunction, ec and catalytic_activity are not defined in the new TSV
      // format and thus set the default value as empty 
      const thefunction = '';
      const ec = '';
      const catalytic_activity = '';
      const [ geneId, geneENSTID, geneENSPID, geneUniProtID, name, geneEntrezID, alternateName, synonyms] = lines[i].split('\t').map(e => utils.trim(e, '"'));
      if (geneId in componentIdDict.gene) { //only keep the ones in the model
        const gene = componentIdDict.gene[geneId];
        Object.assign(gene, { name, alternateName, synonyms, function: thefunction }); // other props are not in the db design, TODO remove them?
      }
    }
  }
}

const createComponentExternalDbFile = (externalIdNodes, externalIdDBMap, extNodeIdTracker, component, componentIdDict, modelDir, outputPath) => {
  const externalIdDBComponentRel = [];
  const filename = `${component}s-new.tsv`;
  const extIDFile = utils.getFile(modelDir, filename);
  const fcomponent = component === 'metabolite' ? 'compartmentalizedMetabolite' : component;

  if (extIDFile) {
    // TODO use one of the csv parsing lib (sync)
    lines = fs.readFileSync(extIDFile, 
              { encoding: 'utf8', flag: 'r' }).split('\n').filter(Boolean);

    var headerArr = [];
    var contentArr = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i][0] == '#') {
        continue;
      } else if (i == 0) { /*read the header line*/
        headerArr = lines[i].split('\t').map(e => e.trim());
        continue;
      } else {
        contentArr = lines[i].split('\t').map(e => utils.trim(e, '"'));
      }

      const id = contentArr[0];
      if (!(id in componentIdDict[fcomponent])) { //only keep the ones in the model
        console.log('Warning: id ' + id + ' not in '  + ' componentIdDict[' + fcomponent+']');
        continue;
      }

      if (fcomponent == "gene"){ /*add two more items Ensembl and Protein Atlas which is not included in the new format*/
        headerArr.push('geneEnsemblID');
        headerArr.push('geneProteinAtlasID');
        contentArr.push(id); /*For Ensembl, externalId is equal to id*/
        contentArr.push(id); /*For Protein Atlas, externalId is equal to id*/  
      }
      const numItem = contentArr.length;

      for (let j = 1; j < numItem; j++) {
        const header = headerArr[j];
        const regexGene = "gene.*ID$";
        const regexRxn = "rxn.*ID$";
        const regexMet = "met.*ID$";
        if ((fcomponent == 'gene' && header.match(regexGene) == null) ||
            (fcomponent == 'reaction' && header.match(regexRxn) == null) ||
            (fcomponent == 'compartmentalizedMetabolite' && header.match(regexMet) == null)) {
          continue;
        }
        const dbName = dbnameDict[fcomponent]['dbname_map'][header];
        const rawExternalId = utils.cleanExternalId(contentArr[j], dbName);
        if (rawExternalId == '') { //ignore the record whithout any valid externalId
          continue;
        }
        // There might be multiple ids in one externalId item
        externalIdArr = rawExternalId.split(';').map(e => e.trim());

        for (var externalId of externalIdArr) {
          const url_prefix = dbnameDict[fcomponent]['url_map'][header];
          var url = "";
          if ( url_prefix != '' && externalId != '') {
            url = dbnameDict[fcomponent]['url_map'][header] + ':' + externalId;
          }

          const externalDbEntryKey = `${dbName}${externalId}${url}`; // diff url leads to new nodes!
          externalId = dbName === 'ChEBI' ? 'CHEBI:'+externalId : externalId;

          let node = null;
          if (externalDbEntryKey in externalIdDBMap) {
            node = externalIdDBMap[externalDbEntryKey]; // reuse the node and id
          } else {
            node = { id: extNodeIdTracker, dbName, externalId, url };
            externalIdDBMap[externalDbEntryKey] = node;
            extNodeIdTracker += 1;

            // save the node for externalDBs.csv
            externalIdNodes.push(node);
          }

          // save the relationships between the node and the current component ID (reaction, gene, etc)
          externalIdDBComponentRel.push({ id, externalDbId: node.id }); // e.g. geneId, externalDbId
        }
      }
    }
  } else {
    console.log(`Warning: cannot find external ID file ${filename} in path`, modelDir);
  }

  // write the associated file
  writer.writeComponentExternalDbCSV(externalIdDBComponentRel, outputPath, fcomponent);
  return extNodeIdTracker;
}


exports.extractInfoFromYaml = extractInfoFromYaml;
exports.createComponentSVGMapFile = createComponentSVGMapFile;
exports.createPMIDFile = createPMIDFile;
exports.extractGeneAnnotation = extractGeneAnnotation;
exports.createComponentExternalDbFile = createComponentExternalDbFile;
