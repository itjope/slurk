const File = require('./backends/File')

const DataStore = (opt) => {
  const options = Object.assign({
    type: 'file',
    path: null
  }, opt)

  const getBackend = type => {
    switch (type) {
      case 'file':
        return File({path: options.path})
        break;
      default:
        throw `Invalid data strategy: ${type}`
    }
  }

  const backend = getBackend(options.type)

  return {
    saveDoc: backend.saveDoc,
    getDocs: backend.getDocs,
    getAllDocs: backend.getAllDocs
  }
}

module.exports = DataStore
