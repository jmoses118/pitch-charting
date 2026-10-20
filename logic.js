/* Thunder Elite pitch charting – Node-only entry for the pure-logic modules.
   require() is Node. The browser never loads this file; index.html loads each js/core script itself.
   Module load order matters: each module reads its dependencies from the shared PC namespace. */
const MODULES=['config','theme','grid','calls','location','flow','game','scoring','csv','workload','sync','modes','store'];
for(const m of MODULES)require('./js/core/'+m+'.js');
module.exports=(typeof window!=='undefined'?window:globalThis).PC;
