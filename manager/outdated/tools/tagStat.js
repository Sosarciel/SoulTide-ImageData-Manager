const fs = require('fs');
const path = require('path');
const { program } = require("commander");
program
    .version("0.0.1")
    .description("构造训练集")
    .requiredOption("-nl, --name_list <string[]>","需要构造的角色名",(str)=>str.split(','))
    .parse(process.argv);
const opts = program.opts();
const rootPath = process.cwd();
console.log('当前目录:'     , rootPath);
console.log('命令行参数:'   , process.argv);
console.log('解析结果:'     , opts);
const trangSetPath = path.join(rootPath,"TraingSet");

// 输入字符串数组
const nameList = opts.name_list;

class TagMap{
    charName = "";
    map = {};
    constructor(charName){
        this.charName = charName;
        this.map = {};
    }
    addByFolderName (type,tag){
        let _index = type.indexOf("_");
        type = type.slice(_index+1,type.length);
        this.add(type,tag);
    }
    add (type,tag){
        if(this.map[type]==null)
            this.map[type] = {};
        if(this.map[type][tag]==null)
            this.map[type][tag] = 0;
        this.map[type][tag]++;
    }
    print (type){
        let flatMap = {};
        if(type==null){
            for(let typeName in this.map){
                let typeMap = this.map[typeName];
                for(let keyName in typeMap){
                    if(flatMap[keyName]==null)
                        flatMap[keyName]=0;
                    flatMap[keyName]+=typeMap[keyName]
                }
            }
        }else{
            let typeMap = this.map[type];
            for(let keyName in typeMap){
                if(flatMap[keyName]==null)
                    flatMap[keyName]=0;
                flatMap[keyName]+=typeMap[keyName]
            }
        }

        let entryList = [];
        for(let key in flatMap)
            entryList.push({
                "name":key,
                "num":flatMap[key]
                });
        entryList.sort((a, b) => b.num-a.num);
    
        let sortMap = {};
        for(let entry of entryList){
            sortMap[entry["name"]] = entry["num"];
            //console.log(entry["name"]+":"+entry["num"])
        }
        console.log(`${this.charName}:`)
        console.log(sortMap)
    }
}



//遍历角色 
for(let charName of nameList){
    const tmap = new TagMap(charName);
    const buildFolder = path.join(trangSetPath,charName,"build");
    const filelist = fs.readdirSync(buildFolder);
    for(const folderName of filelist){
        //概念文件夹路径
        const fullPath = path.join(buildFolder,folderName);
        const stats = fs.statSync(fullPath);
        if(!stats.isDirectory())
            continue;

        const subfilelist = fs.readdirSync(fullPath);
        for(const fileName of subfilelist){
            const ext = path.extname(fileName);
            if(ext!=".txt")
                continue;

            const filePath = path.join(fullPath,fileName);
            const str = fs.readFileSync(filePath, 'utf8');
            const tags = str.split(",");
            for(const tag of tags)
                tmap.addByFolderName(folderName,tag.trim());
        }
    }
    tmap.print();
}
