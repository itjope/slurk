const fs = require('fs')

const File = options => {

  const state = {
    docs: {}
  }

  const saveDocsToDisk = (docs, path) => (
    new Promise((resolve, reject) => {
      fs.writeFile(path, JSON.stringify(docs), (err) => {
        if (err) reject(err)
        resolve(`Docs saved to ${path}`)
      })
    })
  )

  const saveDoc = (path, state, persist) => doc => {
    const id = doc.id
    state.docs[id] = Object.assign({}, state.docs[id], doc)
    return persist(state.docs, path)
  }

  const docsToArray = docs => (
    Object.keys(docs).reduce((result, key) => {
      result.push(docs[key])
      return result
    }, [])
  )

  const getAllDocs = (path, state) => () => (
    new Promise((resolve, reject) => {
      fs.readFile(path, (err, data) => {
        if (err) reject(err)
        try {
          state.docs = JSON.parse(data)
          resolve(docsToArray(state.docs))
        } catch (e) {
          reject(`Failed to parse JSON at ${path}`)
        }
      })
    })
  )

  const getDocs = state => ids => (
    new Promise(resolve => {
      resolve(ids.map(id => state.docs[id]))
    })
  )

  return {
    saveDoc: saveDoc(options.path, state, saveDocsToDisk),
    getDocs: getDocs(state),
    getAllDocs: getAllDocs(options.path, state)
  }
}

module.exports = File
