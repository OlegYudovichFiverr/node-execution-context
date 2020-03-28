const asyncHooks = require('async_hooks');
const hooks = require('./hooks');
const { ExecutionContextErrors } = require('./constants');

describe('Context', () => {
    let Context;
    beforeEach(() => Context = jest.requireActual('.'));

    describe('Initialise node "async_hooks"', () => {
        const spies = {
            asyncHooksCreate: jest.spyOn(asyncHooks, 'createHook'),
            hooksCreate: jest.spyOn(hooks, 'create')
        };

        it('Trigger "async_hooks" create', () => {
            expect(spies.asyncHooksCreate).toHaveBeenCalled();
        });

        it('Uses context hooks create', () => {
            expect(spies.hooksCreate).toHaveBeenCalled();
        });
    });

    describe('Api', () => {
        describe('Create', () => {
            let lastExecutionId;

            it('Creates an execution context', () => {
                Context.create();

                expect(Context.get()).toBeInstanceOf(Object);
            });

            it('Sets executionId', () => {
                Context.create();

                const { executionId } = Context.get();

                lastExecutionId = executionId;
                expect(executionId).toBeDefined();
            });

            it('Create uniq execution id each time', () => {
                Context.create();

                const { executionId } = Context.get();
                expect(executionId === lastExecutionId).toBeFalsy();
            });

            it('Sets initial context data', (done) => {
                Context.create({ my: 'man' });

                setTimeout(() => {
                    const { my } = Context.get();

                    expect(my).toEqual('man');
                    done();
                }, 100);
            });

            it('Throws an error when trying to re-create context under same execution', () => {
                Context.create();

                expect(() => Context.create())
                    .toThrow(ExecutionContextErrors.CONTEXT_ALREADY_DECLARED);
            });
        });

        describe('Get', () => {
            it('Throws an error when context is not created', () => {
                expect(() => Context.get())
                    .toThrow(ExecutionContextErrors.CONTEXT_DOES_NOT_EXISTS);
            });

            describe('When context is created', () => {
                it('Returns context', () => {
                    Context.create({ val: 'value' });
                    const context = Context.get();

                    expect(context.val).toEqual('value');
                });
            });
        });

        describe('Update', () => {
            it('Throws an error when context is not created', () => {
                expect(() => Context.get())
                    .toThrow(ExecutionContextErrors.CONTEXT_DOES_NOT_EXISTS);
            });

            describe('When context is created', () => {
                it('Updates context', () => {
                    Context.create({ val: 'value' });
                    const context = Context.get();

                    expect(context.val).toEqual('value');

                    Context.update({ val: false });
                    expect(Context.get().val).toBeFalsy();
                });
            });
        });
    });

    describe('Context Availability', () => {
        const create = () => Context.create({ hey: true });
        const get = () => Context.get().hey;

        it('Support timeouts', (done) => {
            create();

            setTimeout(() => {
                expect(get()).toBeTruthy();
                Context.update({hey: false});

                setTimeout(() => {
                    expect(get()).toBeFalsy();
                    done();
                }, 200);
            }, 200);
        });

        it('Support micro tasks', (done) => {
            create();

            const microTask = () => new Promise((resolve) => {
                setTimeout(resolve, 200);
            });

            microTask().then(() => {
                expect(get()).toBeTruthy();
                Context.update({hey: false});

                microTask().then(() => {
                    expect(get()).toBeFalsy();
                    done();
                });
            });

        });

        it('Support next ticks', (done) => {
            create();

            process.nextTick(() => {
                expect(get()).toBeTruthy();
                Context.update({hey: false});

                process.nextTick(() => {
                    expect(get()).toBeFalsy();
                    done();
                });
            });
        });
    });
});