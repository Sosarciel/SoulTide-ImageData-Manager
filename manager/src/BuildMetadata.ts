import { Command } from 'commander';
import { DATA_PATH, getCategorizedDir, getProcessedDir } from './Config.schema';
import fs from 'fs';
import { pipe, UtilFT } from '@zwa73/utils';
import path from 'pathe';

export const CmdBuildMetadata = (program: Command) => program
    .command("Build-Metadata")
    .alias("buildmetadata")
    .description("构造trainingset的metadata.csv")
    .action(async()=>{
        const chars = await fs.promises.readdir(DATA_PATH);
        chars.map(async char => {
            if(char[0]==='@') return;
            const processdir = getProcessedDir(char);
            const categorydir = getCategorizedDir(char);

            if(! await UtilFT.pathExists(processdir)) return;
            if(! await UtilFT.pathExists(categorydir)) return;

            //processed
            await pipe(
                UtilFT.fileSearchGlob(processdir, '*/*.txt'),
                async fps => Promise.all(fps.map(async fp =>{
                    const text = await fs.promises.readFile(fp,'utf-8');
                    return {filepath:path.relative(processdir,fp.replace(/(.+)\.txt/,'$1.png')), text};
                })),
                async datas => datas.sort((a, b) => a.filepath.localeCompare(b.filepath)).reduce((acc,cur)=>
                    `${acc}\n"${cur.filepath}","${cur.text}"`
                ,'file_name,text'),
                async text => fs.promises.writeFile(path.join(processdir,'metadata.csv'),text),
            );

            //categorized
            await pipe(
                UtilFT.fileSearchRegex(processdir, /.+\.(png|jpg)$/.source),
                async fps => Promise.all(fps.map(async fp =>{
                    const rfp = path.relative(processdir,fp);
                    return {filepath:rfp, text:path.parse(rfp).dir};
                })),
                async datas => datas.sort((a, b) => a.filepath.localeCompare(b.filepath)).reduce((acc,cur)=>
                    `${acc}\n"${cur.filepath}","${cur.text}"`
                ,'file_name,text'),
                async text => fs.promises.writeFile(path.join(categorydir,'metadata.csv'),text),
            );
        });
});