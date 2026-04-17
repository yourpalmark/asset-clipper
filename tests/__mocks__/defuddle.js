// Jest mock for the defuddle package.
// Returns a constructor that mirrors what the real Defuddle does,
// using the full body HTML as content so asset-extraction tests are predictable.
function MockDefuddle(doc) {
  this.doc = doc;
}
MockDefuddle.prototype.parse = function () {
  return {
    title: this.doc.title || '',
    content: this.doc.body ? this.doc.body.innerHTML : '',
  };
};
module.exports = MockDefuddle;
