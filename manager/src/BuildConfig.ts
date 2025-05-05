import { Command } from 'commander';
import { DATA_PATH, DATASET_PATH, PROCESSED_DIR_NAME } from './Config.schema';
import fs from 'fs';
import { pipe, UtilFT } from '@zwa73/utils';
import path from 'pathe';

export const CmdBuildConfig = (program: Command) => program
    .command("Build-Config")
    .alias("buildconfig")
    .description("构造hugface的cofig")
    .action(async()=>{
        const chars = await fs.promises.readdir(DATA_PATH);
        let txt = 'configs:\n';
        console.info(txt);
        const result = (await Promise.all(chars.map(async char => {
            if(char[0]==='@') return;
            const processdir = path.join(DATASET_PATH,'character',char,PROCESSED_DIR_NAME);
            if(! await UtilFT.pathExists(processdir)) return;

            return`
- config_name: ${char}
  data_files:
  - split: categorized
    path:
    - "character/${char}/categorized/**/*.png"
    - "character/${char}/categorized/**/*.jpg"
  - split: processed
    path:
    - "character/${char}/processed/**/*.png"
    - "character/${char}/processed/metadata.csv"`;
        }))).join('');
        console.info(`configs:${result}`);
});