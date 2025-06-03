import { Command } from 'commander';
import { DATA_PATH, DATASET_PATH, getCategorizedDir, getProcessedDir } from './Config.schema';
import fs from 'fs';
import { pipe, UtilFT } from '@zwa73/utils';
import path from 'pathe';

export const CmdFixFileext = (program: Command) => program
    .command("Fix-Fileext")
    .alias("fixfileext")
    .description("将文件扩展名统一转为小写")
    .action(async()=>{
        const extmap = {
            "PNG":"png",
            "JPG":"jpg",
        };
        await Promise.all(Object.entries(extmap).map(async ([oldExt, newExt]) => {
            const regex = new RegExp(`(.+)\\.(${oldExt})$`);
            const list = await UtilFT.fileSearchRegex(DATASET_PATH, regex);
            await Promise.all(list.map(async fp => {
                const newfp = fp.replace(regex,`$1.${newExt}`);
                if(newfp===fp) return;
                console.log(`正在处理: ${fp} -> ${newfp}`);
                await fs.promises.rename(fp, newfp);
            }));
        }));
    });