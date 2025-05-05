import fs from 'fs';
import path from 'pathe';
import { Command } from 'commander';
import { DATA_PATH, getTrainingSetDir } from './Config.schema';
import { UtilFT } from '@zwa73/utils';
import { parseStrlist } from './Util';

class TagMap {
    map: Record<string,{
        [key: string]: number
    }> = {};

    constructor(public charName:string) {}

    addByFolderName(type: string, tag: string): void {
        const strtype = /.+?_(.+)/.exec(type)![1];
        this.add(strtype, tag);
    }

    add(type: string, tag: string): void {
        if(this.map[type]==null)
            this.map[type] = {};
        if(this.map[type][tag]==null)
            this.map[type][tag] = 0;
        this.map[type][tag]++;
    }
    print (type?: string){
        const flatMap:Record<string,number> = {};
        if(type==null){
            for(const typeName in this.map){
                const typeMap = this.map[typeName];
                for(const keyName in typeMap){
                    if(flatMap[keyName]==null)
                        flatMap[keyName]=0;
                    flatMap[keyName]+=typeMap[keyName]
                }
            }
        }else{
            const typeMap = this.map[type];
            for(const keyName in typeMap){
                if(flatMap[keyName]==null)
                    flatMap[keyName]=0;
                flatMap[keyName]+=typeMap[keyName]
            }
        }

        const entryList:{name:string,num:number}[] = [];
        for(const key in flatMap)
            entryList.push({
                "name":key,
                "num":flatMap[key]
                });
        entryList.sort((a, b) => b.num-a.num);

        const sortMap:Record<string,number>= {};
        for(const entry of entryList)
            sortMap[entry["name"]] = entry["num"];

        console.log(`${this.charName}:`)
        console.log(sortMap)
    }
}

export const CmdStatTrainingSet = (program: Command) => program
    .command("Stat-TrainingSet")
    .alias("stattrainingset")
    .description("统计训练集")
    .argument("<namelist>", "需要统计的角色名 空格 分割", parseStrlist)
    .action(async (nameList:string)=>{
        //遍历角色 
        for(const charName of nameList){
            const tmap = new TagMap(charName);
            const buildFolder = getTrainingSetDir(charName);

            const txtlist = await UtilFT.fileSearchGlob(buildFolder,'**/*.txt');
            for(const filePath of txtlist){
                const str = await fs.promises.readFile(filePath, 'utf8');
                const folderName = path.parse(path.dirname(filePath)).name;
                const tags = str.split(",");
                for(const tag of tags)
                    tmap.addByFolderName(folderName,tag.trim());
            }
            tmap.print();
        }
    });
