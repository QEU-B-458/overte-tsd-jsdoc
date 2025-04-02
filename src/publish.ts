import * as path from 'path';
import * as fs from 'fs';
import * as helper from 'jsdoc/util/templateHelper';
import { Emitter } from './Emitter';
import {parseAndSaveOutput} from './parse'
import { setVerbose, setDebug, warn, debug, docletDebugInfo } from './logger';

/**
 * @param {TAFFY} data - The TaffyDB containing the data that jsdoc parsed.
 * @param {*} opts - Options passed into jsdoc.
 */
export function publish(data: TDocletDb, opts: ITemplateConfig)
{
    // Start with taking into account 'verbose' and 'debug' options.
    setVerbose(!!opts.verbose);
    setDebug(!!opts.debug);

    // In order not to break backward compatibility, the 'documented' generation strategy is used by default.
    if (!opts.generationStrategy)
    {
        opts.generationStrategy = 'documented';
    }
    debug(`publish(): Generation strategy: '${opts.generationStrategy}'`);

    if (opts.generationStrategy === 'documented')
    {
        // Remove undocumented stuff.
        data(
            // Use of a function as the TaffyDB query in order to track what is removed.
            // See [TaffyDB documentation](http://taffydb.com/writing_queries.html)
            function(this: TDoclet) // <= 'this' type declaration inspired from [stackoverflow](https://stackoverflow.com/questions/41944650)
            {
                if (this.undocumented)
                {
                    // Some doclets are marked 'undocumented', but actually have a 'comment' set.
                    if ((! this.comment) || (this.comment === ''))
                    {
                        debug(`publish(): ${docletDebugInfo(this)} removed`);
                        return true;
                    }
                    else
                    {
                        debug(`publish(): ${docletDebugInfo(this)} saved from removal`);
                    }
                }
                return false;
            }
        ).remove();
    }
    else if (opts.generationStrategy === 'exported')
    {
        // We don't remove undocumented doclets with the 'exported' generation strategy.
        // The Emitter._markExported() function will make the appropriate selection later.

        // Disclaimer for an experimental feature.
        warn(`Note: The 'exported' generation strategy is still an experimental feature for the moment, thank you for your comprehension. `
            + `Feel free to contribute in case you find a bug.`);
    }

    // get the doc list and filter out inherited non-overridden members
    const docs = data().get().filter(d => !d.inherited || d.overrides);

    // create an emitter to parse the docs
    const emitter = new Emitter(opts);
    emitter.parse(docs);

    // emit the output
    if (opts.destination === 'console')
    {
        console.log(emitter.emit());
    }
    else
    {
        try
        {
            fs.mkdirSync(opts.destination);
        }
        catch (e)
        {
            if (e.code !== 'EEXIST')
            {
                throw e;
            }
        }

        let filedata: string = emitter.emit().toString()

        filedata = filedata.replace(/(: void)/gmi, '');
        filedata = filedata.replace(/([a-zA-Z])~([a-zA-Z])/g, '$1.$2');

        // Remove "-" character from the type names
        // (but not from YYYY-mm-dd) or (param X-coordinate)
        filedata = filedata.replace(/\b(([A-Z][a-z]+)+)-(([A-Z][a-z]+)+)\b/g, '$1$3');

        // Namespace and types cannot share the same name.
        // Let's add prefix "T" to the types
        filedata = filedata.replace(/\b(Vec[2-4]|Mat4|Quat)\b/g, 'T$1');
        // Restore previous names for namespace
        filedata = filedata.replace(/declare namespace T(Vec[2-4]|Mat4|Quat)/g, 'declare namespace $1');
        filedata = filedata.replace(/\T(Vec[2-4]|Mat4|Quat)\./g, '$1.');

        // "function" is really wrong name for na variable
        filedata = filedata.replace(/function: \(/g, 'fn: (');

        console.log(filedata)

        const pkgArray: any = helper.find(data, { kind: 'package' }) || [];
        const pkg = pkgArray[0] as IPackageDoclet;
        let definitionName: string = 'types';
        if (pkg && pkg.name) {
          definitionName = pkg.name.split('/').pop() || definitionName;
        }
        const out = path.join(opts.destination, opts.outFile || `${definitionName}.d.ts`);
        //fs.writeFileSync(out, emitter.emit());

    }
}

