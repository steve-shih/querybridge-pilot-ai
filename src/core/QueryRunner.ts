import { Db } from 'mongodb';
import vm from 'vm';

export class QueryRunner {
  static async execute(db: Db, queryCode: string): Promise<any> {
    const sandbox = {
      db: db,
      result: null as any
    };
    
    // Create a context
    vm.createContext(sandbox);
    
    // We execute the string but need it to assign the promise to the sandbox so we can await it
    const code = `
      (async () => {
        try {
          const res = await ${queryCode}.toArray ? await ${queryCode}.toArray() : await ${queryCode};
          result = { success: true, data: res };
        } catch (e) {
          result = { success: false, error: e.message };
        }
      })();
    `;

    try {
      const script = new vm.Script(code);
      script.runInContext(sandbox);

      // We need to wait for the async execution within the sandbox to finish
      // A small hack: since VM doesn't return the promise, we poll or use immediate.
      // Better approach in the sandbox is to return the Promise natively
      const promiseCode = `(async () => {
         const executor = ${queryCode};
         if (executor.toArray) {
             return await executor.toArray();
         }
         return await executor;
      })()`;
      
      const resPromise = vm.runInContext(promiseCode, sandbox);
      return await resPromise;

    } catch (e: any) {
      console.error("[QueryRunner] Execution error", e);
      throw new Error(`VM Execution Error: ${e.message}`);
    }
  }
}
