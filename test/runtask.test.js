'use strict';
const test = require('tape');
const RunTask = require('../');

test('setup', (t) => {
  t.plan(3);
  t.equal(typeof RunTask.constructor, 'function', 'RunTask is a class');
  const runner = new RunTask();
  t.equal(typeof runner.register, 'function', 'register is a function');
  t.equal(typeof runner.run, 'function', 'run is a function');
});

test('runs basic fn', (t) => {
  t.plan(2);
  const runner = new RunTask();
  runner.register('test', (done) => {
    t.pass('fn is called');
    done();
  });

  runner.run('test', () => {
    t.pass('run callback is called');
  });
});

test('run callback not required', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.register('test', (done) => {
    t.pass('fn is called');
    done();
  });

  runner.run(['test']);
});

test('can pass in string to run', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.register('test', (done) => {
    t.pass('fn is called');
    done();
  });

  runner.run('test');
});

test('runs in series', (t) => {
  t.plan(2);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', (done) => {
    t.equal(count, 0, 'test1 is called first');
    count++;
    done();
  });
  runner.register('test2', (done) => {
    t.equal(count, 1, 'test2 is called second');
    done();
  });

  runner.run(['test1', 'test2']);
});

test('runs in series and parallel', (t) => {
  t.plan(2);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', (done) => {
    setTimeout(() => {
      t.equal(count, 1, 'test1 is called');
      done();
    }, 1000);
  });
  runner.register('test2', (done) => {
    t.equal(count, 0, 'test2 is called');
    count++;
    done();
  });

  runner.run([['test1', 'test2']]);
});

test('nested parallel tasks', (t) => {
  t.plan(1);
  const runner = new RunTask();
  let count = 0;
  runner.register('test', (done) => {
    count++;
    done();
  });
  runner.run([[['test', 'test'], 'test']], () => {
    t.equal(count, 3, 'test ran 3 times');
  });
});

test('error if running task that doesnt exist', (t) => {
  t.plan(1);
  const runner = new RunTask();
  runner.run('hi', (err) => {
    t.ok(err instanceof Error);
  });
});

test('throw error if no callback', (t) => {
  t.plan(1);
  const runner = new RunTask();
  t.throws(() => {
    runner.run('hi');
  });
});

test('run class with execute function', (t) => {
  t.plan(1);
  class Test {
    execute(done) {
      t.pass('class.execute is called');
      done();
    }
  }
  const runner = new RunTask();
  runner.register('test', new Test());
  runner.run('test');
});

test('be able to set array of tasks', (t) => {
  t.plan(2);
  const runner = new RunTask();
  runner.register('test1', (done) => {
    t.pass('test1 called');
    done();
  });
  runner.register('test2', (done) => {
    t.pass('test2 called');
    done();
  });
  runner.register('test', ['test1', 'test2']);
  runner.run('test');
});

test('if you pass in a task alias, then make sure first array is run in series', (t) => {
  t.plan(4);
  const runner = new RunTask();
  let count = 0;
  runner.register('test1', (done) => {
    setTimeout(() => {
      t.equal(count, 0, 'test1 ran first');
      count++;
      t.pass('test1 called');
      done();
    });
  });
  runner.register('test2', (done) => {
    t.equal(count, 1, 'test1 ran first');
    t.pass('test2 called');
    done();
  });
  runner.register('test', ['test1', 'test2']);
  runner.run('test');
});

test('complex alias example', (t) => {
  t.plan(5);
  const runner = new RunTask();
  let count = 0;

  runner.register('series1', (done) => {
    setTimeout(() => {
      t.equal(count, 0, 'series 1 ran first');
      count++;
      done();
    }, 5);
  });

  runner.register('parallel1', (done) => {
    setTimeout(() => {
      t.equal(count, 3, 'parallel tasks returns after parallels2 & 3 done');
      count++;
      done();
    }, 100);
  });

  runner.register('parallel2', (done) => {
    setTimeout(() => {
      t.equal(count, 1, 'parallel2 tasks returns after series1');
      count++;
      done();
    }, 1);
  });

  runner.register('parallel3', (done) => {
    setTimeout(() => {
      t.equal(count, 2, 'parallel3 tasks returns after parallel2');
      count++;
      done();
    }, 50);
  });

  runner.register('series2', (done) => {
    setTimeout(() => {
      t.equal(count, 4, 'series2 ran after all parallel finished');
      count++;
      done();
    }, 1);
  });

  runner.register('complex', [
    'series1', ['parallel1', 'parallel2', 'parallel3'], 'series2'
  ]);
  runner.run('complex');
});

test('nested alias', (t) => {
  t.plan(4);
  const runner = new RunTask();
  let count = 0;

  runner.register('series1', (done) => {
    setTimeout(() => {
      t.equal(count, 0, 'series 1 ran first');
      count++;
      done();
    }, 10);
  });

  runner.register('parallel1', (done) => {
    setTimeout(() => {
      t.equal(count, 2, 'parallel1 task returns after series1 and parallel2');
      count++;
      done();
    }, 100);
  });

  runner.register('parallel2', (done) => {
    setTimeout(() => {
      t.equal(count, 1, 'parallel2 tasks returns after series 1 and before parallel1');
      count++;
      done();
    }, 1);
  });

  runner.register('series2', (done) => {
    t.equal(count, 3, 'series2 ran after all parallel finished');
    count++;
    done();
  });

  runner.register('alias1', ['series1', ['parallel1', 'parallel2']]);
  runner.register('nested', ['alias1', 'series2']);
  runner.run('nested');
});

test('onStart and onFinish', (t) => {
  t.plan(4);
  let count = 0;
  const runner = new RunTask({
    onStart: (name) => {
      count++;
      t.equal(name, 'thing', 'task is name');
    },
    onFinish: (name) => {
      t.equal(name, 'thing', 'task is name');
      t.equal(count, 2, 'onFinish called second');
    }
  });
  runner.register('thing', (done) => {
    t.equal(count, 1, 'onStart was called first');
    count++;
    done();
  });
  runner.run('thing');
});
test('onStart and onFinish for classes', (t) => {
  t.plan(4);
  let count = 0;
  const runner = new RunTask({
    onStart: (name) => {
      count++;
      t.equal(name, 'test', 'name is test');
    },
    onFinish: (name) => {
      t.equal(name, 'test', 'name is test');
      t.equal(count, 2, 'onFinish called second');
    }
  });
  class Test {
    execute(done) {
      t.equal(count, 1, 'onStart was called first');
      count++;
      done();
    }
  }
  runner.register('test', new Test());
  runner.run('test');
});
