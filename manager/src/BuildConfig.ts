import { Command } from 'commander';
import { DATA_PATH, getProcessedDir } from './Config.schema';
import fs from 'fs';
import { UtilFT } from '@zwa73/utils';

export const CmdBuildConfig = (program: Command) => program
    .command("Build-Config")
    .alias("buildconfig")
    .description("构造hugface的cofig")
    .action(async()=>{
        const chars = await fs.promises.readdir(DATA_PATH);
        const result = (await Promise.all(chars.map(async char => {
            if(char[0]==='@') return;
            const processdir = getProcessedDir(char);
            if(! await UtilFT.pathExists(processdir)) return;

            return`
- config_name: ${char}
  data_files:
  - split: categorized
    path:
    - "character/${char}/categorized/**/*.png"
    - "character/${char}/categorized/**/*.jpg"
    - "character/${char}/categorized/metadata.csv"
  - split: processed
    path:
    - "character/${char}/processed/**/*.png"
    - "character/${char}/processed/metadata.csv"`;
        }))).join('');
        console.info(`configs:${result}`);
});