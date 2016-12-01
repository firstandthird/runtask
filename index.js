'use strict';
const async = require('async');

class RunTask {
  constructor(options) {
    this.tasks = {};
    if (options) {
      if (options.onStart) {
        this.onStart = options.onStart;
      }
      if (options.onFinish) {
        this.onFinish = options.onFinish;
      }
    }
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
      if (this.onStart) {
        this.onStart(task.name, task);
      }
      return fn.execute((err, result) => {
        if (this.onFinish) {
          this.onFinish(task.name, task);
        }
        return done(err, result);
      });
    }
    if (Array.isArray(fn)) {
      return this.runOne(fn, done);
    }
    fn(done);
  }

  run(tasks, done) {
    // a string can be either the name of a single task function or class
    // or the name of a list of task functions / classes
    if (typeof tasks === 'string') {
      // if it's a list already it doesn't need to be cast:
      if (this.tasks[tasks] && Array.isArray(this.tasks[tasks])) {
        tasks = this.tasks[tasks];
      } else {
        tasks = [tasks];
      }
    }
    if (!tasks) {
      return done(new Error(`${tasks} does not exist`));
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
