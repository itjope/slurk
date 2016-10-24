const elasticlunr = require('elasticlunr')

const Elasticlunr = (options) => {
  const createIndex = (docTemplate) => {
    const ref = 'id'
    const index = elasticlunr()
    index.setRef(ref)
    Object.keys(docTemplate).filter(key => key !== ref).forEach(key => {
      index.addField(key)
    })
    return index
  }

  const state = {
    index: createIndex(options.docTemplate)
  }

  const search = index => searchString => (
    new Promise((resolve, reject) => {
      try {
        resolve(index.search(searchString) || [])
      } catch (e) {
        reject(e)
      }
    })
  )

  const saveDoc = index => doc => (
    new Promise((resolve, reject) => {
      try {
        resolve(index.updateDoc(doc))
      } catch (e) {
        reject(e)
      }
    })
  )

  const loadDocs = index => docs => {
    return new Promise((resolve, reject) => {
      try {
        docs.forEach(doc => {
          index.addDoc(doc)
        })
        resolve(docs.length)
      } catch (e) {
        reject(e)
      }
    })
  }

  return {
    search: search(state.index),
    saveDoc: saveDoc(state.index),
    loadDocs: loadDocs(state.index)
  }

}

module.exports = Elasticlunr
