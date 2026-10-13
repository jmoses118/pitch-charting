/* Thunder Elite pitch charting – node entry point for the pure-logic modules.
   The browser loads js/core/*.js directly (see index.html); node tests require this file.
   Module load order matters: each module reads its dependencies from the shared PC namespace. */
const MODULES=['grid','calls','game','scoring','csv','workload','sync','store'];
for(const m of MODULES)require('./js/core/'+m+'.js');
module.exports=(typeof window!=='undefined'?window:globalThis).PC;
