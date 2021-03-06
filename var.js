const dbnameDict = {
  'reaction' : {
    'url_map': {
      'rxnKEGGID': 'https://identifiers.org/kegg.reaction',
      'rxnBiGGID': 'https://identifiers.org/bigg.reaction',
      'rxnEHMNID': '',
      'rxnHepatoNET1ID': '',
      'rxnREACTOMEID': 'https://identifiers.org/reactome',
      'rxnRecon3DID': 'https://identifiers.org/vmhreaction',
      'rxnMetaNetXID': 'https://identifiers.org/metanetx.reaction',
      'rxnHMR2ID': '',
      'rxnRatconID': '',
      'rxnTCDBID': '',
      'spontaneous': '',
      'rxnRheaID': 'https://identifiers.org/rhea',
      'rxnRheaMasterID': 'https://identifiers.org/rhea',
    },
    'dbname_map': {
      'rxnKEGGID': 'KEGG',
      'rxnBiGGID': 'BiGG',
      'rxnEHMNID': 'EHMN',
      'rxnHepatoNET1ID': 'HepatoNET1',
      'rxnREACTOMEID': 'Reactome',
      'rxnRecon3DID': 'Recon3D',
      'rxnMetaNetXID': 'MetaNetX',
      'rxnHMR2ID': 'HMR 2.0',
      'rxnRatconID': 'Ratcon',
      'rxnTCDBID': 'TCDB',
      'spontaneous': 'spontaneous',
      'rxnRheaID': 'Rhea',
      'rxnRheaMasterID': 'RheaMaster',
    },
  },
  'compartmentalizedMetabolite' : {
    'url_map':{
      'metBiGGID': 'https://identifiers.org/bigg.metabolite',
      'metKEGGID': 'https://identifiers.org/kegg.metabolite',
      'metHMDBID': 'https://identifiers.org/hmdb',
      'metChEBIID': 'https://identifiers.org/CHEBI',
      'metPubChemID': 'https://identifiers.org/pubchem.compound',
      'metLipidMapsID': 'https://identifiers.org/lipidmaps',
      'metEHMNID': '',
      'metHepatoNET1ID': '',
      'metRecon3DID': 'https://identifiers.org/vmhmetabolite',
      'metMetaNetXID': 'https://identifiers.org/metanetx.chemical',
      'metHMR2ID': '',

    },
    'dbname_map': {
      'metBiGGID': 'BiGG',
      'metKEGGID': 'KEGG',
      'metHMDBID': 'HMDB',
      'metChEBIID': 'ChEBI',
      'metPubChemID': 'PubChem',
      'metLipidMapsID': 'LipidMaps',
      'metEHMNID': 'EHMN',
      'metHepatoNET1ID': 'HepatoNET1',
      'metRecon3DID': 'Recon3D',
      'metMetaNetXID': 'MetaNetX',
      'metHMR2ID': 'HMR 2.0',
    },
  },
  'gene' : {
    'url_map':{
      'geneENSTID':'https://identifiers.org/ensembl',
      'geneENSPID':'https://identifiers.org/ensembl',
      'geneUniProtID':'https://identifiers.org/uniprot',
      'geneEntrezID':'https://identifiers.org/ncbigene',
      'geneEnsemblID':'https://identifiers.org/ensembl',
      'geneProteinAtlasID':'https://identifiers.org/hpa',
    },
    'dbname_map': {
      'geneENSTID':'Ensembl transcript',
      'geneENSPID':'Ensembl protein',
      'geneUniProtID':'UniProt',
      'geneEntrezID':'NCBI Gene',
      'geneEnsemblID':'Ensembl',
      'geneProteinAtlasID':'Protein Atlas',
    },
  },
  'subsystem' : {
    'url_map': {
    },
    'dbname_map':{
    },
  },
};

module.exports = {
  dbnameDict,
};
