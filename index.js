'use strict';
const async = require('async');

class RunTask {
  constructor() {
    this.tasks = {};
  }

  register(name, fn) {
    this.tasks[name] = fn;
  }

  runOne(task, done) {
    if (Array.isArray(task)) {
      return async.each(task, this.runOne.bind(this), done);
    }
    const fn = this.tasks[task];
    if (!fn) {
      return done(new Error(`${task} does not exist`));
    }
    if (typeof fn.execute === 'function') {
      return fn.execute(done);
    }
    if (Array.isArray(fn)) {
      return this.runOne(fn, done);
    }
    fn(done);
  }

  run(tasks, done) {
    if (typeof tasks === 'string') {
      tasks = this.tasks[tasks];
    }
    async.eachSeries(tasks, this.runOne.bind(this), (err) => {
      if (typeof done === 'function') {
        return done(err);
      }
      if (err) {
        throw err;
      }
    });
  }
}

module.exports = RunTask;
