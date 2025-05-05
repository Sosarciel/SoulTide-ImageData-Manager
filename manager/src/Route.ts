import { program } from "commander";
import { CmdAddBG } from "./AddBG";
import { CmdBuildTrainingSet } from "./BuildTrainingSet";
import { CmdStatTrainingSet } from "./StatTrainingSet";
import { CmdBuildInfo } from "./BuildInfo";
import { CmdCheckTrainingset } from "./CheckTrainingset";
import { CmdExtractFirstFrame } from "./ExtractFirstFrame";
import { CmdExcludePrompt } from "./ExcludePrompt";
import { CmdCollectCharPrompt } from "./CollectCharPrompt";
import { CmdBuildStyle } from "./BuildStyle";
import { CmdMergeStyle } from "./MergeStyle";
import { CmdProcessPrompt } from "./ProcessPrompt";
import { CmdScaleImage } from "./ScaleImage";
import { CmdEvalLog } from "./EvalLog";
import { CmdResizeImage } from "./ResizeImage";

export async function cliRoute() {
    CmdAddBG(program);
    CmdBuildTrainingSet(program);
    CmdStatTrainingSet(program);
    CmdBuildInfo(program);
    CmdCheckTrainingset(program);
    CmdExtractFirstFrame(program);
    CmdExcludePrompt(program);
    CmdProcessPrompt(program);
    CmdCollectCharPrompt(program);
    CmdBuildStyle(program);
    CmdMergeStyle(program);
    CmdScaleImage(program);
    CmdEvalLog(program);
    CmdResizeImage(program);
    program.parse(process.argv);
}
cliRoute();