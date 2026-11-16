import { Command } from 'commander';
import fs from 'fs';
import path from 'pathe';
import { spawnSync } from 'child_process';
import { run7z } from './Repack';
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

// 读取归档内的扁平文件列表并校验扁平性
function getZipFlatEntries(zipPath: string): { ok: boolean; files: string[]; reason?: string } {
    const listRes = run7z(['l', '-ba', '-slt', zipPath]);
    if (!listRes.success) {
        return { ok: false, files: [], reason: `读取目录列表失败: ${listRes.stderr}` };
    }

    const content = listRes.stdout.replace(/\r\n/g, '\n').trim();
    if (!content) {
        return { ok: false, files: [], reason: `压缩包内容为空` };
    }

    const rawBlocks = content.split(/\n\s*\n/);
    const files: string[] = [];

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

        if (!itemPath || itemPath === zipPath || itemPath === path.basename(zipPath)) continue;

        // 扁平性校验：禁止子目录或带路径分隔符
        if (isFolder || itemPath.includes('/') || itemPath.includes('\\')) {
            return { ok: false, files: [], reason: `内部包含嵌套子目录或路径层级: "${itemPath}"` };
        }

        files.push(itemPath);
    }

    return { ok: true, files };
}

export const CmdVerifyRepack = (program: Command) => program
    .command("Verify-Repack")
    .alias("verify")
    .description("递归验证 candidate.zip、training_script.zip 和 training_set.zip 的完整性与结构")
    .argument("<targets...>", "角色目标名称 (支持空格分开或逗号分隔，如 Satya,Silenus)",parseStrlist)
    .action(async (targetsRaw: string[]) => {
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

        let totalPassed = 0;
        let totalWarned = 0;

        for (const targetName of targetNames) {
            const targetDir = path.join(BASE_CHARACTER_DIR, targetName);
            console.log(`\n==================================================`);
            console.log(`[START] 校验目标目录: ${targetDir}`);

            // 2. 检查 current / archive 架构
            const currentPath = path.join(targetDir, 'current');
            const archivePath = path.join(targetDir, 'archive');

            if (!fs.existsSync(currentPath)) {
                console.warn(`\x1b[33m[WARN] [${targetName}] 缺少必需的 current 目录，跳过该角色。\x1b[0m`);
                totalWarned++;
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

            console.log(`[INFO] [${targetName}] 共收集到 ${tasks.length} 个版本目录，开始逐一校验...\n`);

            // 4. 遍历校验每个 version
            for (const task of tasks) {
                const taskLabel = `[${targetName}][${task.section}/${task.version}]`;
                const issues: string[] = [];

                const candZipPath = path.join(task.versionDir, pakName);
                const scriptZipPath = path.join(task.versionDir, scriptPakName);
                const setZipPath = path.join(task.versionDir, 'training_set.zip');

                // 阶段一：先测试压缩完整性 (7z t) - 确保即便结构有误也能检查压缩是否损坏
                const targetFiles = [
                    { name: pakName, p: candZipPath },
                    { name: scriptPakName, p: scriptZipPath },
                    { name: 'training_set.zip', p: setZipPath }
                ];

                for (const item of targetFiles) {
                    if (!fs.existsSync(item.p)) {
                        issues.push(`文件缺失: ${item.name}`);
                    } else {
                        const testRes = run7z(['t', '-bd', item.p]);
                        if (!testRes.success) {
                            issues.push(`压缩包完整性测试失败 (${item.name}): ${testRes.stderr || testRes.stdout}`);
                        }
                    }
                }

                // 阶段二：校验结构合规性
                // 1. 校验 candidate.zip 内部结构
                if (fs.existsSync(candZipPath)) {
                    const candEntries = getZipFlatEntries(candZipPath);
                    if (!candEntries.ok) {
                        issues.push(`[${pakName}] ${candEntries.reason}`);
                    } else {
                        const candLogs = candEntries.files.filter(f => /logs?\.txt$/.test(f));
                        const candUses = candEntries.files.filter(f => /^use(\d+|last)\.txt$/.test(f));
                        const candSafes = candEntries.files.filter(f => f.endsWith('.safetensors'));
                        const candUnknown = candEntries.files.filter(f =>
                            !candLogs.includes(f) && !candUses.includes(f) && !candSafes.includes(f)
                        );

                        if (candLogs.length !== 1) {
                            issues.push(`[${pakName}] Log txt 不符合预期 (需严格 1 个 *logs?.txt)，实际包含 ${candLogs.length} 个`);
                        }
                        if (candUses.length !== 1) {
                            issues.push(`[${pakName}] Use txt 不符合预期 (需严格 1 个 use(\\d+|last).txt)，实际包含 ${candUses.length} 个`);
                        }
                        if (candSafes.length === 0) {
                            issues.push(`[${pakName}] 缺少 *.safetensors 权重 (至少需要 1 个)`);
                        }
                        if (candUnknown.length > 0) {
                            issues.push(`[${pakName}] 存在未许可杂项文件: [${candUnknown.join(', ')}]`);
                        }
                    }
                }

                // 2. 校验 training_script.zip 内部结构
                if (fs.existsSync(scriptZipPath)) {
                    const scriptEntries = getZipFlatEntries(scriptZipPath);
                    if (!scriptEntries.ok) {
                        issues.push(`[${scriptPakName}] ${scriptEntries.reason}`);
                    } else {
                        // 严格匹配同 repack 规则的 .sh
                        const expectedShPattern = new RegExp(`^.+${escapeRegExp(task.version)}\\.sh$`);
                        const scriptSh = scriptEntries.files.filter(f => expectedShPattern.test(f));
                        const scriptLogs = scriptEntries.files.filter(f => /logs?\.txt$/.test(f));
                        const scriptUses = scriptEntries.files.filter(f => /^use(\d+|last)\.txt$/.test(f));
                        const scriptUnknown = scriptEntries.files.filter(f =>
                            !scriptSh.includes(f) && !scriptLogs.includes(f) && !scriptUses.includes(f)
                        );

                        if (scriptSh.length !== 1) {
                            issues.push(`[${scriptPakName}] *.sh 不符合预期 (需严格 1 个匹配 /.+${task.version}\\.sh$/)，实际匹配到: [${scriptSh.join(', ')}]`);
                        }
                        if (scriptLogs.length !== 1) {
                            issues.push(`[${scriptPakName}] Log txt 不符合预期 (需严格 1 个 *logs?.txt)，实际包含 ${scriptLogs.length} 个`);
                        }
                        if (scriptUses.length !== 1) {
                            issues.push(`[${scriptPakName}] Use txt 不符合预期 (需严格 1 个 use(\\d+|last).txt)，实际包含 ${scriptUses.length} 个`);
                        }
                        if (scriptUnknown.length > 0) {
                            issues.push(`[${scriptPakName}] 存在未许可杂项文件: [${scriptUnknown.join(', ')}]`);
                        }
                    }
                }

                // 输出结果
                if (issues.length > 0) {
                    console.warn(`\x1b[33m${taskLabel} 发现问题 (${issues.length} 项):\n${issues.map(i => `  - ${i}`).join('\n')}\x1b[0m`);
                    totalWarned++;
                } else {
                    console.log(`\x1b[32m${taskLabel} 校验通过 (压缩包完整且结构符合预期)\x1b[0m`);
                    totalPassed++;
                }
            }
        }

        console.log(`\n==================================================`);
        console.log(`[DONE] 批量校验结束 | 合格: \x1b[32m${totalPassed}\x1b[0m, 告警/异常: \x1b[33m${totalWarned}\x1b[0m`);
    });