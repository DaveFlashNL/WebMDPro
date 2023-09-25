import React from 'react';
import {
    belowDesktop
} from '../utils';

import { ForcedEncodingFormat } from '../redux/convert-dialog-feature';

import Slide from '@material-ui/core/Slide';
import { makeStyles } from '@material-ui/core/styles';
import { TransitionProps } from '@material-ui/core/transitions';
import Tooltip from '@material-ui/core/Tooltip';
import { lighten } from '@material-ui/core/styles';
import { Codec } from '../services/interfaces/netmd';

export const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export function TooltipOrDefault(params: { children: any; title: any; arrow: boolean; tooltipEnabled: boolean }) {
    if (!params.tooltipEnabled) {
        return params.children;
    } else {
        return (
            <Tooltip title={params.title} arrow={params.arrow}>
                {params.children}
            </Tooltip>
        );
    }
}

export const useStyles = makeStyles(theme => ({
    container: {
        display: 'flex',
        flexDirection: 'row',
    },
    formControl: {
        minWidth: 60,
    },
    toggleButton: {
        minWidth: 40,
    },
    dialogContent: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'stretch',
    },
    himdDialog: {
        maxWidth: 800,
    },
    formatAndTitle: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    rightBlock: {
        display: 'flex',
        flexDirection: 'column',
    },
    titleFormControl: {
        minWidth: 170,
        marginTop: 4,
        [belowDesktop(theme)]: {
            width: 114,
            minWidth: 0,
        },
    },
    spacer: {
        display: 'flex',
        flex: '1 1 auto',
    },
    showTracksOrderBtn: {
        marginLeft: theme.spacing(1),
    },
    tracksOrderAccordion: {
        '&:before': {
            opacity: 0,
        },
    },
    tracksOrderAccordionDetail: {
        maxHeight: '40vh',
        overflow: 'auto',
    },
    toolbarHighlight:
        theme.palette.type === 'light'
            ? {
                color: theme.palette.secondary.main,
                backgroundColor: lighten(theme.palette.secondary.light, 0.85),
            }
            : {
                color: theme.palette.text.primary,
                backgroundColor: theme.palette.secondary.dark,
            },
    trackList: {
        flex: '1 1 auto',
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    nameNotFit: {
        color: theme.palette.warning.main,
    },
    warningMediocreEncoder: {
        color: theme.palette.warning.main,
    },
    durationNotFit: {
        color: theme.palette.error.main,
    },
    timeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
        textUnderlineOffset: '3px',
    },
    durationsSpan: {
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: theme.spacing(2),
    },
    advancedOptionsAccordion: {
        boxShadow: 'none',
        marginTop: theme.spacing(2),
        '&:before': {
            opacity: 0,
        },
    },
    advancedOptionsAccordionContents: {
        flexDirection: 'column',
    },
    advancedOptionsAccordionSummary: {
        boxShadow: 'none',
        minHeight: '32px !important',
        height: '32px',
        padding: 0,
    },
    advancedOption: {
        width: '100%',
    },
    fixedTable: {
        tableLayout: 'fixed',
    },
    selectCheckboxTableCell: {
        width: 20,
    },
    toggleButtonWarning: {
        color: `${theme.palette.warning.main} !important`,
    },
    forcedEncodingLabel: {
        color: theme.palette.warning.main,
    },
}));

export type FileWithMetadata = {
    file: File;
    title: string;
    album: string;
    artist: string;
    duration: number;
    forcedEncoding: ForcedEncodingFormat;
    bytesToSkip: number;
};

export function createForcedEncodingText(selectedCodec: Codec, file: { forcedEncoding: ForcedEncodingFormat }) {
    const remapTable: { [name: string]: string } = {
        SPS: 'Stereo SP - Homebrew!',
        SPM: 'Mono SP - Homebrew!',
        // MP3 is not a forced encoding for minidisc specs that do not support it natively.
        'AT3@66kbps': 'LP4',
        'AT3@105kbps': 'LP2',
        'AT3@132kbps': 'LP2',
    };
    if (!file.forcedEncoding) return '';
    let fullCodecName = file.forcedEncoding.codec + (file.forcedEncoding?.bitrate ? `@${file.forcedEncoding.bitrate!}kbps` : '');
    if (file.forcedEncoding.codec === 'MP3' && selectedCodec.codec !== 'MP3') {
        return '';
    }
    return remapTable[fullCodecName] ?? fullCodecName;
}

