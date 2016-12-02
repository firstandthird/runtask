'use strict';
const async = require('async');

class RunTask {
  constructor(options) {
    this.tasks = {};
    options = options || {};
    this.onStart = options.onStart || function() { };
    this.onFinish = options.onFinish || function() { };
  }

  register(name, fn) {
    this.tasks[name] = fn;
  }

  runOne(task, done) {
    const onStart = this.onStart;
    const onFinish = this.onFinish;
    if (Array.isArray(task)) {
      return async.each(task, this.runOne.bind(this), done);
    }
    const fn = this.tasks[task];
    if (!fn) {
      return done(new Error(`${task} does not exist`));
    }
    if (typeof fn.execute === 'function') {
      onStart(task);
      return fn.execute((err, result) => {
        onFinish(task);
        return done(err, result);
      });
    }
    if (Array.isArray(fn)) {
      return this.runOne(fn, done);
    }
    onStart(task);
    fn(done);
    onFinish(task);
  }

  run(tasks, done) {
    // a string can be either the name of a single task function or class
    // or the name of a list of task functions / classes
    if (typeof tasks === 'string') {
      // if the string maps on to a list of tasks,
      // treat that list as the intended top-level item:
      if (this.tasks[tasks] && Array.isArray(this.tasks[tasks])) {
        return this.run(this.tasks[tasks], done);
      }
      // otherwise cast it as a list and continue:
      tasks = [tasks];
    }
    // if the top-level is a list of tasks, and any of those subtasks is a string referring to a list of tasks
    // that sub-list needs to be merged into the top-level list:
    if (Array.isArray(tasks)) {
      const newTasks = [];
      tasks.forEach((subtask) => {
        // if any subtasks in that array are strings that map to lists, we expand them into the top-level list:
        if (typeof subtask === 'string' && this.tasks[subtask] && Array.isArray(this.tasks[subtask])) {
          this.tasks[subtask].forEach((item) => {
            newTasks.push(item);
          });
        // otherwise just leave it for runOne to process:
        } else {
          newTasks.push(subtask);
        }
      });
      tasks = newTasks;
    }
    if (!tasks) {
      return done(new Error(`${tasks} does not exist`));
    }
    // flatten any lists at the top level:
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
