import React from 'react';
import { useDispatch } from 'react-redux';
import { useShallowEqualSelector } from '../utils';

import { actions as appActions } from '../redux/app-feature';

import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import Typography from '@material-ui/core/Typography';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import Link from '@material-ui/core/Link';
import { makeStyles } from '@material-ui/core/styles';
import { TransitionProps } from '@material-ui/core/transitions';
import { W95AboutDialog } from './win95/about-dialog';
import { GIT_DIFF, GIT_HASH, BUILD_DATE } from '../version-info';
import { AboutTranslations } from '../languages';
const t = AboutTranslations;

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & { children?: React.ReactElement<any, any> },
    ref: React.Ref<unknown>
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

const useStyles = makeStyles(theme => ({
    reflinks: {
        '& a': {
            textDecoration: 'underline',
            color: '#909090',
        },
        '& a:hover': {
            textDecoration: 'underline',
            color: '#222222',
        },
        '& a:visited': {
            textDecoration: 'underline',
            color: '#7e7e7e',
        },
    },
    nobul: {
        listStyle: 'none',

    },
}));

export const AboutDialog = (props: {}) => {
    const dispatch = useDispatch();
    const classes = useStyles();
    let visible = useShallowEqualSelector(state => state.appState.aboutDialogVisible);
    const vintageMode = useShallowEqualSelector(state => state.appState.vintageMode);

    const handleClose = () => {
        dispatch(appActions.showAboutDialog(false));
    };

    if (vintageMode) {
        const p = {
            visible,
            handleClose,
        };
        return <W95AboutDialog {...p} />;
    }

    return (
        <Dialog
            open={visible}
            maxWidth={'sm'}
            fullWidth={true}
            TransitionComponent={Transition as any}
            aria-labelledby="about-dialog-slide-title"//About Web MiniDisc Pro
        >
            <DialogTitle id="about-dialog-slide-title">{t['about-dialog.tsx']}</DialogTitle>
            <DialogContent>
                <DialogContentText>Web MiniDisc Pro {t['uses']}</DialogContentText>
                <div className={classes.reflinks}>
                    <ul>
                        <li>
                            <Link rel="noopener noreferrer" href="https://www.ffmpeg.org/" target="_blank">
                                FFmpeg
                            </Link>{' '}
                            and{' '}
                            <Link rel="noopener noreferrer" href="https://github.com/ffmpegjs/FFmpeg" target="_blank">
                                ffmpegjs
                            </Link>
                            , {t['aufil']} (wav, mp3, ogg, mp4, etc...).
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://github.com/dcherednik/atracdenc/" target="_blank">
                                Atracdenc
                            </Link>
                            , to support atrac3 encoding (MD-LP LP2 &amp; LP4 audio formats).
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://emscripten.org/" target="_blank">
                                Emscripten
                            </Link>
                            , to run both FFmpeg and Atracdenc in the browser.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://github.com/cybercase/netmd-js" target="_blank">
                                netmd-js
                            </Link>
                            , to send commands to NetMD devices using Javascript.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://github.com/asivery/netmd-exploits" target="_blank">
                                netmd-exploits
                            </Link>
                            , to download ATRAC via USB and trigger low-level firmware code.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://github.com/asivery/netmd-tocmanip" target="_blank">
                                netmd-tocmanip
                            </Link>
                            , to read and manipulate the table of contents.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://github.com/glaubitz/linux-minidisc" target="_blank">
                                linux-minidisc
                            </Link>
                            , to make the netmd-js project possible.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://react95.io/" target="_blank">
                                react95
                            </Link>
                            , to build the vintage user interface.
                        </li>
                        <li>
                            <Link rel="noopener noreferrer" href="https://material-ui.com/" target="_blank">
                                material-ui
                            </Link>
                            , to build the user interface.
                        </li>
                    </ul>
                    <DialogContentText>Attribution</DialogContentText>
                    <ul>
                        <li>
                            MiniDisc logo from{' '}
                            <Link rel="noopener noreferrer" href="https://en.wikipedia.org/wiki/MiniDisc" target="_blank">
                                https://en.wikipedia.org/wiki/MiniDisc
                            </Link>
                        </li>
                        <li>
                            MiniDisc icon from{' '}
                            <Link
                                rel="noopener noreferrer"
                                href="https://www.deviantart.com/blinkybill/art/Sony-MiniDisc-Plastic-Icon-473812540"
                                target="_blank"
                            >
                                http://fav.me/d7u3g3g
                            </Link>
                        </li>
                    </ul>
                    <DialogContentText>Disclaimers</DialogContentText>
                    <ul className={classes.nobul}>
                        <li>
                            This version is under visual construction, if you experience any <br />
                            issues, please visit the main version:{' '}
                            <Link rel="noopener noreferrer" href="https://web.minidisc.wiki" target="_blank">https://web.minidisc.wiki</Link>
                        </li>
                    </ul>
                </div>
                <DialogContentText>Version info</DialogContentText>
                <DialogContentText style={{ textAlign: 'center', fontSize: 13 }}>
                    Version 1.4.2 #{GIT_HASH} {(GIT_DIFF as any) === '0' ? '' : `(${GIT_DIFF} diff-lines ahead)`} <br /> built on {BUILD_DATE}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};
/*exclamations: This version is primarily built from technical updates implemented by Asivery, Sir68K &amp; others
                    to the existing core of Stefano Brilli's original authentic work, for the express purpose of extending it with added
                    functionalities that permit among other things correct operation in combination with the Sony MZ-RH1 for transferring
                    audio tracks back to the pc as well as overall stability enhancements for all other compatible NetMD players/recorders.<br />
                    <br />While the repo I, DaveFlash, maintain for this live version will only include the needed additional superficial
                    enhancements to wordings, dialogs, UI/UX, look-and-feel and the underlying html and css code for the purpose of making
                    it more user-friendly for everyone, most parts of the technical side of things is explicitly outside of my purview.
                    Links to all authors of this software are included in the copyright section on the bottom of the site*/