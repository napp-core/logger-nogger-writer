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

interface IError {
    message: string;
    name?: string
    stack?: string;
}

function error2json(err: any) {
    if (err) {
        if (typeof err.toJSON === 'function') {
            return JSON.stringify(err)
        }
        let e: IError = {
            message: ''
        }
        if (err.message) {
            e.message = err.message
        } else {
            e.message = String(err)
        }
        if (err.name) {
            e.name = err.name
        }
        if (err.stack) {
            e.stack = err.stack
        }

        return e;
    }

    return {
        message: 'Unknown Error'
    }
}

export function logWriter2nogger(opt: OWriter2nogger): ILogWriter {

    const wData: Array<ILogItem> = [];
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
                let token = await genToken();
                let resp = await fetch(url, {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8',
                        authorization: 'bearer ' + token
                    },
                    body: JSON.stringify(body)
                });

                if (resp.ok) {
                    return void (0);
                }
            } catch (error) {
                err = error;

                console.warn('tryCount :', i)
                console.warn(error)
            }
        }
        throw err;
    }

    const item2nogger = (it: ILogItem) => {

        let errors: any = undefined;

        if (Array.isArray(it.errors)) {
            errors = it.errors.map(e => error2json(e))
        }

        let ret: INoggerPayload = {
            c: it.logname,
            l: LogLevel[it.level],
            i: it.attrs?.instance,
            j: it.attrs?.job,
            k: it.attrs?.msgKey,
            m: it.message,
            a: errors ? { ... (it.attrs || {}, errors) } : it.attrs,
            n: new Date(it.timestamp),
            u: it.track,
            t: it.tags

        }
        return ret;
    }

    const doWrite = async () => {
        if ($.basy) return;

        $.basy = true;
        try {
            let items = wData.splice(0);

            if (items.length > 0) {
                if (items.length > 1) {
                    await httpWrite(items.map(it => item2nogger(it)), opt.tryCount || 3)
                } else {
                    await httpWrite(item2nogger(items[0]), opt.tryCount || 3)
                }
            }

            if (wData.length > 0) {
                doWrite();
            }
        } catch (error) {
            console.log('log write error', error)
        } finally {
            $.basy = false;
        }
    }

    let writer: ILogWriter = (l: ILogItem) => {
        wData.push(l);
        doWrite();
    }



    return writer;
}