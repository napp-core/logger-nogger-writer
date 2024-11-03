import { Exception } from "@napp/exception";
import { ILogItem, ILogWriter, LogLevel } from "@napp/logger"
import { fetch } from "cross-fetch"
import * as jose from 'jose';

export interface OWriter2nogger {
    clintHost: string;
    clientSource: string;
    serverBaseUrl: string
    serverSecret: string;
    tryCount?: number
}

type NoggerAttributeValue = {}
interface INoggerPayload {
    c?: string; category?: string;
    l?: string; level?: string;
    i?: string; instance?: string;
    j?: string; job?: string;
    k?: string; key?: string;
    m?: string; message?: string;
    a?: NoggerAttributeValue; attr?: NoggerAttributeValue;
    n?: Date; created?: Date;
    u?: string; trackid?: string;

    t?: string[], tag?: string[]
}



export interface ILogWriterOfNogger extends ILogWriter {

    writeWaiter: () => Promise<void>
}
export function logWriter2nogger(opt: OWriter2nogger): ILogWriterOfNogger {

    let wData: Array<ILogItem> = [];
    const $ = {
        basy: false,
        token: '',
        exp: 0
    };

    const genToken = async () => {
        let n = Date.now();

        if ($.exp > n) {
            return $.token;
        }

        let secret = new TextEncoder().encode(opt.serverSecret)
        let builder = new jose.SignJWT({
            h: opt.clintHost,
            s: opt.clientSource
        })
            .setExpirationTime('10m')
            .setProtectedHeader({ alg: 'HS256' })
            .setJti('nogger-client')



        $.token = await builder.sign(secret);
        $.exp = Date.now() + 9 * 60 * 1000;

        return $.token;
    }

    const httpWrite = async (body: any, loop: number) => {
        let i = 0;
        let err: any = undefined;
        while (i++ < loop) {
            try {
                let url = `${opt.serverBaseUrl}/api/write`;

                let headers: HeadersInit = {
                    'Content-Type': 'application/json; charset=utf-8'
                }
                if (opt.serverSecret) {
                    let token = await genToken();
                    headers["authorization"] = 'bearer ' + token;
                }

                // console.log(url, token, body);

                let resp = await fetch(url, {
                    method: 'post',
                    headers,
                    body: JSON.stringify(body)
                });

                // console.log('333333333',resp)

                if (resp.ok) {
                    return await resp.json();
                }

                let nested: Exception;

                let respText = await resp.text();
                try {
                    let json = JSON.parse(respText);

                    nested = Exception.from(json)
                } catch (error) {
                    nested = new Exception(respText)
                }

                throw new Exception(["cannot write log. response ${statusText}. status (${status})", { status: resp.status, statusText: resp.statusText }], {
                    name: 'log.write.cannot',
                    cause: nested
                })

            } catch (error) {
                err = error;
                console.warn('tryCount :', i, error)
            }
        }
        throw err;
    }

    const item2nogger = (it: ILogItem) => {

        let ret: INoggerPayload = {
            c: it.logname,
            l: LogLevel[it.level],
            i: (it.attrs?.instance || it.attrs?.ins) as string || undefined,
            j: it.attrs?.job as string || undefined,
            k: (it.attrs?.logKey || it.attrs?.msgKey) as string || undefined,
            m: it.message,
            a: it.attrs,
            n: new Date(it.timestamp),
            u: it.attrs?.track as string || undefined,
            t: Array.isArray(it.attrs?.tags) ? it.attrs?.tags as any : undefined

        }
        return ret;
    }

    const doWrite = async () => {
        if ($.basy) return;

        $.basy = true;
        try {
            await sleep(20)
            await _doWrite();
        } catch (error) {
            console.log('log write error', error)
        } finally {
            $.basy = false;
        }
    }
    const _doWrite = async () => {
        let items = wData;
        wData = [];

        if (items.length > 0) {
            if (items.length > 1) {
                await httpWrite(items.map(it => item2nogger(it)), opt.tryCount || 3)
            } else {
                await httpWrite(item2nogger(items[0]), opt.tryCount || 3)
            }
        }

        if (wData.length > 0) {
            await _doWrite();
        }
    }


    let writer: ILogWriterOfNogger = ((l: ILogItem) => {
        wData.push(l);
        doWrite();
    }) as ILogWriterOfNogger

    writer.writeWaiter = async () => {
        while (true) {
            if (wData.length === 0 && $.basy === false) {
                return void 0;
            }
            await sleep(50)
        }
    }





    return writer;
}



function sleep(ms: number) {
    return new Promise<void>((resolve) => {
        setTimeout(() => {
            resolve();
        }, ms);
    });
}