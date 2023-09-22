Napp logger. log to nogger server


# install
```
npm i @napp/logger-nogger-writer
```

# use

``` typescript
import { LogLevel, LogManager, sampleLogWriter } from "@napp/logger";
import { logWriter2nogger } from "@napp/logger-nogger-writer";



// LogManager.addWriter({
//     level: LogLevel.info,
//     writer: sampleLogWriter()
// })

LogManager.addWriter({    
    level: LogLevel.info,
    writer: logWriter2nogger({
        clintHost: 'test-server',
        clientSource: 'test-app',
        serverBaseUrl: 'http://localhost:4043',
        serverSecret:  'xxxxxxxxxxxxxxxx'
    })
})


```