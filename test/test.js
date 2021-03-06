
var DB = require('../lib/db')
const assert = require('assert')

describe('DB', function () {
  it('可以设置options', function () {
    const options = {}
    const db = new DB(options)
    assert.equal(db.options, options)
  })

  it('可以设置endpoint插件，使得该请求用制定的方式处理', function (done) {
    class XX extends DB {
      constructor(options) {
        super(options)
        this.hooks.endpoint.tap('endpoint',function () {
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve({ retcode: 0, res: { msg: 'hello world' } })
            }, 0)
          })
        })
      }
    }

    const xx = new XX()
    xx.request()
      .then((res) => {
        assert.equal(res.res.msg, 'hello world')
        done()
      })
  })

  it('可以根据不同的options，使用不同的endpoint', function (done) {
    class AA extends DB {
      constructor(options) {
        super(options)
        this.hooks.endpoint.tap('logout',function (options) {
          if (options.type === 1) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ retcode: 1, msg: 'logout' })
              }, 0)
            })
          }
        })
        this.hooks.endpoint.tap('endpoint',function (options) {
          if (options.type === 0) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ retcode: 0, res: { msg: 'hello world' } })
              }, 0)
            })
          }
        })
      }
    }

    const aa = new AA()
    // 如果 options.type === 1，则返回第一个答案
    aa.request({ type: 1 })
      .then(res => {
        assert.equal(res.retcode, 1)
        // 如果 options.type === 0，则返回第二个答案
        return aa.request({ type: 0 })
      }).then(res => {
        assert.equal(res.retcode, 0)
        done()
      })
  })

  it('可以设置options插件来处理options', function (done) {
    class YY extends DB {
      constructor(options) {
        super(options)
        this.hooks.options.tap('options',(options) => {
          // modify options
          options.flag = true
          return options
        })
        this.hooks.endpoint.tap('endpoint',function(options){
          // init
          assert.equal(options.init, true)
          // merge
          assert.equal(options.url, 'my://hello')
          // options plugin modify
          assert.equal(options.flag, true)
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve({ retcode: 0, res: { msg: 'hello world' } })
            }, 0)
          })
        })
      }
    }

    const yy = new YY({ init: true })
    yy.request({ url: 'my://hello' })
      .then((res) => {
        done()
      })
  })

  it('可以设置多个options插件', function (done) {
    class BB extends DB {
      constructor(options) {
        super(options)
        this.hooks.options.tap('options',(options) => {
          // modify options
          options.flag = true
          return options
        })
        this.hooks.options.tap('options',(options) => {
          // modify options，后面的覆盖前面的
          options.flag = false
          return options 
        })
        this.hooks.options.tap('options',(options) => {
          options.url = 'you://hello'
          return options
        })
        this.hooks.endpoint.tapPromise('endpoint',(options) => {
          // init
          assert.equal(options.init, true)
          // merge
          assert.equal(options.url, 'you://hello')
          // options plugin modify
          assert.equal(options.flag, false)

          return new Promise((resolve, reject) => {
            setTimeout(() => {
              resolve({ retcode: 0, res: { msg: 'hello world' } })
            }, 0)
          })
        })
      }
    }

    const bb = new BB({ init: true })
    bb.request({ url: 'my://hello' })
      .then((res) => {
        done()
      })
  })

  it('可以通过judge插件判断返回是否正确', function (done) {
    class CC extends DB {
      constructor(options) {
        super(options)
        this.hooks.endpoint.tap('options',function (options) {
          if (options.type === 1) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ retcode: 1, msg: 'logout' })
              }, 0)
            })
          }
        })
        this.hooks.endpoint.tap('endpoint',function (options) {
          if (options.type === 0) {
            return new Promise((resolve) => {
              setTimeout(() => {
                resolve({ retcode: 0, res: { msg: 'hello world' } })
              }, 0)
            })
          }
        })

        this.hooks.judge.tap('judge',function (res) {
          if (res.retcode !== 0) return true
        })
      }
    }

    const cc = new CC
    cc.request({ type: 0 })
      .then((res) => {
        assert.equal(res.res.msg, 'hello world')
        return cc.request({ type: 1 })
      }).then((res) => {
        done(new Error('不应该进入正确回调，应当进入失败回调，因为retcode为1'))
      }, (res) => {
        assert.equal(res.retcode, 1)
        assert.equal(res.msg, 'logout')
        done()
      })
  })

  it('可以reject数据', function (done) {
    class ZZ extends DB {
      constructor(options) {
        super(options)
        this.hooks.endpoint.tap('endpoint', function () {
          return new Promise((resolve, reject) => {
            reject()
          })
        })
      }
    }

    const zz = new ZZ

    zz.request()
      .then(() => {
        done(new Error('should not trigger resolve callback'))
      }, () => {
        done()
      })
  })
})