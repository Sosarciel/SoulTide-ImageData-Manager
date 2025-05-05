import { Command } from 'commander';
import { DATASET_PATH } from './Config.schema';
import fs from 'fs';
import { pipe, UtilFT } from '@zwa73/utils';
import path from 'pathe';

export const CmdBuildMetadata = (program: Command) => program
    .command("Build-Metadata")
    .alias("buildmetadata")
    .description("构造trainingset的metadata.csv")
    .action(async()=>{
        await pipe(
            UtilFT.fileSearchGlob(DATASET_PATH, '**/processed/*/*.txt'),
            async fps => Promise.all(fps.map(async fp =>{
                const text = await fs.promises.readFile(fp,'utf-8');
                return {filepath:fp.replace(/(.+)\.txt/,'$1.png'), text};
            })),
            async datas => datas.reduce((acc,cur)=>
                `${acc}${cur.filepath},"${cur.text}"`
            ,'file_name,text'),
            async text => fs.promises.writeFile(path.join(DATASET_PATH,'metadata.csv'),text),
        )
});