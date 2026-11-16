import { Command } from 'commander';
import fs from 'fs';
import path from 'pathe';
import { spawnSync } from 'child_process';
import { MODEL_PATH } from './Config.schema';
import { parseStrlist } from './Util';

// 基础目录
const BASE_CHARACTER_DIR = MODEL_PATH;
const pakName = 'candidate.zip';
const scriptPakName = 'training_script.zip';

// 辅助：转义正则表达式特殊字符
function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 运行 7z 命令封装
export function run7z(args: string[], cwd?: string): { success: boolean; stdout: string; stderr: string } {
    const result = spawnSync('7z', args, { cwd, encoding: 'utf-8' });
    return {
        success: result.status === 0,
        stdout: result.stdout || '',
        stderr: result.stderr || ''
    };
}

/**
 * 抽象打包与自检函数：
 * 1. 仅存储模式 (-mx0) + 强制 UTF-8 标志位 (-mcu=on) 封装为 ZIP
 * 2. 自动调用 `7z t` 对新生成的归档进行 CRC 完整性测试，损坏则抛出异常
 */
function packAndTestZip(archiveName: string, files: string[], cwd: string): void {
    // 1. 打包
    const packRes = run7z(['a', '-tzip', '-mx0', '-mcu=on', archiveName, ...files], cwd);
    if (!packRes.success) {
        throw new Error(`打包 ${archiveName} 失败: ${packRes.stderr || packRes.stdout}`);
    }

    // 2. 自动测试验证完整性 (7z t)
    const testRes = run7z(['t', '-bd', archiveName], cwd);
    if (!testRes.success) {
        throw new Error(`验证 ${archiveName} 完整性失败 (压缩包损坏或校验和不匹配): ${testRes.stderr || testRes.stdout}`);
    }
}

// 检查单个 version 目录内的 zip 文件
interface ValidateResult {
    ok: boolean;
    reason?: string;
    targetZipName?: string;
    baseName?: string;
    shFile?: string;
    logFile?: string;
    useFile?: string;
    safetensorsList?: string[];
    trainingSetFile?: string; // <--- 新增此字段
}

function validateVersionZip(versionDir: string, version: string): ValidateResult {
    const files = fs.readdirSync(versionDir);
    // 严格区分大小写：前缀至少 1 字符 + version + .zip
    const zipPattern = new RegExp(`^.+${escapeRegExp(version)}\\.zip$`);
    const matchedZips = files.filter(f => zipPattern.test(f));

    if (matchedZips.length === 0) {
        return { ok: false, reason: `未找到符合 /.+${version}\\.zip$/ 的目标压缩包` };
    }
    if (matchedZips.length > 1) {
        return { ok: false, reason: `匹配到多个候选压缩包: [${matchedZips.join(', ')}]，无法决断` };
    }

    const targetZipName = matchedZips[0]!;
    const targetZipPath = path.join(versionDir, targetZipName);
    const baseName = targetZipName.slice(0, -4); // 去除 .zip

    // 使用 7z l -ba -slt 纯内存校验内部结构
    const listRes = run7z(['l', '-ba', '-slt', targetZipPath]);
    if (!listRes.success) {
        return { ok: false, reason: `7z 无法读取归档元数据: ${listRes.stderr}` };
    }

    const content = listRes.stdout.replace(/\r\n/g, '\n').trim();
    if (!content) {
        return { ok: false, reason: `压缩包内容为空` };
    }

    const rawBlocks = content.split(/\n\s*\n/);
    const archiveFiles: string[] = [];

    for (const block of rawBlocks) {
        const lines = block.split('\n');
        let itemPath: string | null = null;
        let isFolder = false;

        for (const line of lines) {
            if (line.startsWith('Path = ')) {
                itemPath = line.substring(7).trim();
            } else if (line.startsWith('Folder = +')) {
                isFolder = true;
            }
        }

        if (!itemPath || itemPath === targetZipPath || itemPath === targetZipName) continue;

        // 扁平性校验：禁止子目录或带路径分隔符
        if (isFolder || itemPath.includes('/') || itemPath.includes('\\')) {
            return { ok: false, reason: `扁平性校验失败，包含嵌套路径或目录: "${itemPath}"` };
        }

        archiveFiles.push(itemPath);
    }

    // 严格分类比对（无 /i 标志）
    const expectedSh = `${baseName}.sh`;
    const matchedSh: string[] = [];
    const matchedLogTxt: string[] = [];
    const matchedUseTxt: string[] = [];
    const matchedSafetensors: string[] = [];
    const matchedTrainingSet: string[] = [];
    const unknownFiles: string[] = [];

    for (const file of archiveFiles) {
        if (file === expectedSh) {
            matchedSh.push(file);
        } else if (file === 'training_set.zip' || file === 'TrainingSet.zip') {
            matchedTrainingSet.push(file);
        } else if (/^use(\d+|last)\.txt$/.test(file)) {
            matchedUseTxt.push(file);
        } else if (/logs?\.txt$/.test(file)) {
            matchedLogTxt.push(file);
        } else if (file.endsWith('.safetensors')) {
            matchedSafetensors.push(file);
        } else {
            unknownFiles.push(file);
        }
    }

    const errs: string[] = [];
    if (unknownFiles.length > 0) {
        errs.push(`存在未许可杂项文件: [${unknownFiles.join(', ')}]`);
    }
    if (matchedSh.length !== 1) {
        errs.push(`*.sh 不符合预期 (需严格 1 个 "${expectedSh}")，匹配到: [${matchedSh.join(', ')}]`);
    }
    if (matchedLogTxt.length !== 1) {
        errs.push(`Log txt 不符合预期 (需严格 1 个 *logs?.txt)，匹配到: [${matchedLogTxt.join(', ')}]`);
    }
    if (matchedUseTxt.length !== 1) {
        errs.push(`Use txt 不符合预期 (需严格 1 个 use(\\d+|last).txt)，匹配到: [${matchedUseTxt.join(', ')}]`);
    }
    if (matchedSafetensors.length === 0) {
        errs.push(`缺少 *.safetensors 权重 (至少需要 1 个)`);
    }
    if (matchedTrainingSet.length !== 1) {
        errs.push(`数据集压缩包不符合预期 (需在 training_set.zip 或 TrainingSet.zip 中严格存在二者之一)，实际匹配到: [${matchedTrainingSet.join(', ')}]`);
    }

    if (errs.length > 0) {
        return { ok: false, reason: errs.join('\n') };
    }

    return {
        ok: true,
        targetZipName,
        baseName,
        shFile: matchedSh[0],
        logFile: matchedLogTxt[0],
        useFile: matchedUseTxt[0],
        safetensorsList: matchedSafetensors,
        trainingSetFile: matchedTrainingSet[0] // <--- 返回实际的文件名
    };
}

export const CmdRepackCkpt = (program: Command) => program
    .command("Repack-Ckpt")
    .alias("repack")
    .description("递归扫描整理并重打包 current/archive 下的模型与训练脚本")
    .argument("<targets...>", "角色目标名称 (支持空格分开或逗号分隔，如 Satya,Silenus)",parseStrlist)
    .option("--allow-delete", "校验重打包完成后删除原 zip", false)
    .action(async (targetsRaw: string[], opt: { allowDelete: boolean; }) => {
        const targetNames = targetsRaw;
        if (targetNames.length === 0) {
            console.error('\x1b[31m[ERROR] 未提供任何有效的角色名称。\x1b[0m');
            return;
        }

        // 1. 检查全局 7z
        const test7z = spawnSync('7z', [], { encoding: 'utf-8' });
        if (test7z.error || test7z.status !== 0) {
            console.error('\x1b[31m[ERROR] 未检测到 7z 命令，请确认系统已配置环境变量。\x1b[0m');
            return;
        }

        let successCount = 0;
        let skipCount = 0;

        for (const targetName of targetNames) {
            const targetDir = path.join(BASE_CHARACTER_DIR, targetName);
            console.log(`\n==================================================`);
            console.log(`[START] 扫描目标目录: ${targetDir}`);

            // 2. 检查 current / archive 架构
            const currentPath = path.join(targetDir, 'current');
            const archivePath = path.join(targetDir, 'archive');

            if (!fs.existsSync(currentPath)) {
                console.warn(`\x1b[33m[WARN] [${targetName}] 目录格式不符合要求: 缺少必需的 "${currentPath}" 目录，跳过该角色。\x1b[0m`);
                skipCount++;
                continue;
            }

            const scanSections = [{ name: 'current', dir: currentPath }];
            if (fs.existsSync(archivePath)) {
                scanSections.push({ name: 'archive', dir: archivePath });
            } else {
                console.log(`[INFO] 未检测到 archive 目录，仅扫描 current。`);
            }

            // 3. 收集所有 [version] 目录
            interface TaskItem {
                section: string;
                version: string;
                versionDir: string;
            }
            const tasks: TaskItem[] = [];

            for (const sec of scanSections) {
                const subEntries = await fs.promises.readdir(sec.dir, { withFileTypes: true });
                for (const ent of subEntries) {
                    if (ent.isDirectory()) {
                        tasks.push({
                            section: sec.name,
                            version: ent.name,
                            versionDir: path.join(sec.dir, ent.name)
                        });
                    }
                }
            }

            console.log(`[INFO] [${targetName}] 共收集到 ${tasks.length} 个版本目录，开始逐一处理...\n`);

            // 4. 遍历处理每个 version
            for (const task of tasks) {
                const taskLabel = `[${targetName}][${task.section}/${task.version}]`;
                console.log(`--------------------------------------------------`);
                console.log(`${taskLabel} 开始检查...`);

                const validation = validateVersionZip(task.versionDir, task.version);
                if (!validation.ok) {
                    console.warn(`\x1b[33m${taskLabel} 跳过处理:\n${validation.reason}\x1b[0m`);
                    skipCount++;
                    continue;
                }

                const { targetZipName, shFile, logFile, useFile, safetensorsList, trainingSetFile } = validation;
                const targetZipPath = path.join(task.versionDir, targetZipName!);
                const tmpDir = path.join(task.versionDir, 'tmp');

                // 检查 version 目录下是否预先存在冲突的 tmp
                if (fs.existsSync(tmpDir)) {
                    console.warn(`\x1b[33m${taskLabel} 跳过处理: 该版本目录下已存在 tmp/ 目录，防止数据覆盖。\x1b[0m`);
                    skipCount++;
                    continue;
                }

                try {
                    // 创建隔离区并解压
                    await fs.promises.mkdir(tmpDir);
                    const unpackRes = run7z(['x', targetZipPath, `-o${tmpDir}`, '-y']);
                    if (!unpackRes.success) {
                        throw new Error(`7z 解压失败: ${unpackRes.stderr}`);
                    }

                    // 打包并自检权重合集 (safetensors + log.txt + use*.txt)
                    console.log(`${taskLabel} 正在打包并测试 ${pakName}...`);
                    const ckptFiles = [...safetensorsList!, logFile!, useFile!];
                    packAndTestZip(pakName, ckptFiles, tmpDir);

                    // 打包并自检脚本与标注 (sh + log.txt + use*.txt)
                    console.log(`${taskLabel} 正在打包并测试 ${scriptPakName}...`);
                    const scriptFiles = [shFile!, logFile!, useFile!];
                    packAndTestZip(scriptPakName, scriptFiles, tmpDir);

                    // 产物转移回 version 目录
                    const artifacts = [
                        { src: pakName, dest: pakName },
                        { src: scriptPakName, dest: scriptPakName },
                        { src: trainingSetFile!, dest: 'training_set.zip' }
                    ];
                    for (const art of artifacts) {
                        const srcPath = path.join(tmpDir, art.src);
                        const destPath = path.join(task.versionDir, art.dest);
                        await fs.promises.rename(srcPath, destPath);
                    }

                    // 清理 tmp 目录
                    await fs.promises.rm(tmpDir, { recursive: true, force: true });

                    // 删除原包处理
                    if (opt.allowDelete) {
                        await fs.promises.unlink(targetZipPath);
                        console.log(`\x1b[32m${taskLabel} 处理且自检成功，原压缩包已删除。\x1b[0m`);
                    } else {
                        console.log(`\x1b[32m${taskLabel} 处理且自检成功，原压缩包已保留 (--allow-delete 未启用)。\x1b[0m`);
                    }

                    successCount++;
                } catch (err: any) {
                    // 异常发生时清理残余 tmp，保留原始数据
                    if (fs.existsSync(tmpDir)) {
                        await fs.promises.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
                    }
                    console.error(`\x1b[31m${taskLabel} 处理失败: ${err?.message || err}\x1b[0m`);
                    skipCount++;
                }
            }
        }

        console.log(`\n==================================================`);
        console.log(`[DONE] 批量任务结束 | 成功: \x1b[32m${successCount}\x1b[0m, 跳过/异常: \x1b[33m${skipCount}\x1b[0m`);
    });