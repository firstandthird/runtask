# runtask

[![Build Status](https://travis-ci.org/firstandthird/runtask.svg?branch=master)](https://travis-ci.org/firstandthird/runtask)

  __runtask__ is a lightweight, easy-to-use, highly flexible task-running library.  

  A 'task' is assigned a name and can be run by calling its name.  It can be either an individual JS function or any object that defines a function named 'execute'.  But a 'task' can also be a list of other tasks, and each of those tasks in turn can itself be a list of individual tasks.  Tasks in the top-level list will execute sequentially, tasks in the lists below the top-level are executed in parallel.  

See _/test/runtask.test.js_ for usage and examples.
