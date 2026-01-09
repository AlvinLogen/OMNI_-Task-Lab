class ExecutionManager {
    constructor() {
        this.engines = {
            ftp: new FTPEngine(),
            python: new PythonEngine(),
            powershell: new PowerShellEngine(),
            api: new ApiEngine()
        };
    }

    async executeTask(task, executionId){
        const engine = this.engines[task.task_type];

        if(!engine) {
            throw new Error(`Unsupported task type: ${task.task_type}`);
        }

        return await engine.execute(task.config, executionId);
    }
}