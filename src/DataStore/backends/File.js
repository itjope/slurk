const fs = require('fs')
const merge = require('lodash.merge')

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
    const mergedDoc = merge({}, state.docs[id], doc)
    state.docs[id] = mergedDoc
    return persist(state.docs, path).then(() => {
      return mergedDoc
    })
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
          resolve([])
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
