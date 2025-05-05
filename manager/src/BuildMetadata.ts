import { Command } from 'commander';
import { DATA_PATH, DATASET_PATH, PROCESSED_DIR_NAME } from './Config.schema';
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
            const processdir = path.join(DATASET_PATH,'character',char,PROCESSED_DIR_NAME);
            if(! await UtilFT.pathExists(processdir)) return;
            await pipe(
                UtilFT.fileSearchGlob(processdir, '*/*.txt'),
                async fps => Promise.all(fps.map(async fp =>{
                    const text = await fs.promises.readFile(fp,'utf-8');
                    return {filepath:path.relative(processdir,fp.replace(/(.+)\.txt/,'$1.png')), text};
                })),
                async datas => datas.reduce((acc,cur)=>
                    `${acc}\n"${cur.filepath}","${cur.text}"`
                ,'file_name,text'),
                async text => fs.promises.writeFile(path.join(processdir,'metadata.csv'),text),
            );
        });
});