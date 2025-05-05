import { Command } from "commander";
import fs from 'fs';
import path from 'pathe';
import { PRecord, UtilFT } from "@zwa73/utils";
import { DATA_PATH, TrainingSetInfo, TRAINING_SET_DIR_NAME, CATEGORUZED_DIR_NAME, PROCESSED_DIR_NAME, INFO_FILE_NAME } from "./Config.schema";
import { capitalizeFirstLetter, parseStrlist } from "./Util";





const Prime = 'prime';
const Standard = 'standard';
const L2d = 'l2d';
const VaildTypeList = [Prime,Standard,L2d] as const;
type VaildType = typeof VaildTypeList[number];
const CountMap = {
    prime:2,
    standard:1,
    l2d:1,
};

export const CmdBuildInfo = (program: Command) => program
    .command("Build-Info")
    .alias("buildinfo")
    .description("在processed生成分类info")
    .argument("<namelist>", "需要构造的角色名 空格 分割",parseStrlist)
    .action(async (nameList:string[])=>{
        //遍历角色
        for(const charName of nameList){
            //待处理文件夹
            const processFolder = path.join(DATA_PATH,charName,PROCESSED_DIR_NAME);
            await UtilFT.ensurePathExists(processFolder,{dir:true});
            //info路径
            const infoPath = path.join(processFolder,INFO_FILE_NAME);
            if(await UtilFT.pathExists(infoPath)){
                console.log(`${infoPath} 已存在 已跳过`);
                continue;
            }
            //文件夹
            const filelist = await fs.promises.readdir(processFolder,{withFileTypes:true});
            const dirlist = filelist.filter(f=>f.isDirectory());

            const info:TrainingSetInfo = {};
            //遍历角色的不同概念
            for(const dir of dirlist){
                const match = /([^_]+)_([^_]+)/.exec(dir.name);
                if(!match) throw `${dir.name} 不符合分类命名`;
                const typeName = match[1];
                const quality = match[2];
                const count = CountMap[quality as VaildType];
                if(!count) throw `${dir.name} ${quality} 品质不存在`;
                const formatName = capitalizeFirstLetter(typeName)+capitalizeFirstLetter(quality);
                const sublist = await fs.promises.readdir(path.join(dir.parentPath,dir.name));
                if(sublist.length<=0){
                    console.log(`${dir.name} 文件夹下没有文件 已跳过`);
                    continue;
                }
                info[formatName]= typeName=='other'? {
                    folder_list:[dir.name],
                    tags:[`st${charName.toLocaleLowerCase()}`],
                    train_count:count
                } : {
                    folder_list:[dir.name],
                    tags:[`st${charName.toLocaleLowerCase()}`,`st${charName.toLocaleLowerCase()}-c${typeName}`],
                    train_count:count
                }
            }
            await UtilFT.writeJSONFile(infoPath,info,{compress:true,compressThreshold:50});
        }
    });