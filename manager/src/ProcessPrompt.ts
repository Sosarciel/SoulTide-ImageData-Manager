import { Command } from 'commander';
import {addPromptset, classificationPrompt, excludePrompt, ExcludePromptOpt, getPatternsCategory} from '@sosarciel-stablediffusion/prompt-classifier';

export const CmdProcessPrompt = (program: Command) => program
    .command("Process-Prompt")
    .alias("processprompt")
    .description("匹配并排除style")
    .argument("<input>", "输入prompt 逗号分隔",(str)=>str
        .replace(/[\r\n]/g,'').replace(/_/g,' ').split(',').map(v=>v.trim()))
    .option("-a, --add", `加入数据到词库`,false)
    .action(async(input:string[],opt?:{add:boolean})=>{
        const psd = await classificationPrompt(...input);

        const missed = psd.missed??[];
        delete psd.missed;

        Object.entries(psd).forEach(([k,v])=>{
            console.log(`${k}:`,v);
        });

        console.log(`missed: ${missed.join(', ')}`);

        if(opt?.add){
            await addPromptset(psd);
        }
    });
