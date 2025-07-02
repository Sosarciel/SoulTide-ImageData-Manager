import { Command } from 'commander';
import {addPromptset, ExtractPromptOpt, extractPrompt, getPatternsCategory} from '@sosarciel-stablediffusion/imagedata-prompt-classifier';
import { parseStrlist } from './Util';

export const CmdExtractPrompt = (program: Command) => program
    .command("Extract-Prompt")
    .alias("extractprompt")
    .description("匹配并排除style")
    .argument("<input>", "输入prompt",str=>str.replace(/[\r\n]/g,'').replace(/_/g,' ').split(','))
    .option("-i, --include <list>", `包含列表 与exclude冲突时排除 默认包含全部 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .option("-e, --exclude <list>", `排除列表 默认无 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .option("-r, --reserve <list>", `优先保留列表 与exclude冲突时保留 默认无 允许值为:${Object.keys(getPatternsCategory()).join('|')}`,parseStrlist)
    .action(async(input:string[],opt?:ExtractPromptOpt)=>{
        //if(opt?.exclude?.[0]=="*") opt.exclude = (await getPatternsCategory()).map(v=>v.name);
        const {exclude,reserve} = await extractPrompt(input,opt);
        console.log(`exclude:\n${exclude.join(', ')}`);
        console.log(`reserve:\n${reserve.join(', ')}`);
});
