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
    }, 1);
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

