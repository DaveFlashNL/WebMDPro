import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { batchActions } from 'redux-batched-actions';

import IconButton from '@material-ui/core/IconButton';
import Menu from '@material-ui/core/Menu';
import MenuItem from '@material-ui/core/MenuItem';
import Divider from '@material-ui/core/Divider';
import MoreVertIcon from '@material-ui/icons/MoreVert';

import { wipeDisc, listContent, selfTest, exportCSV, importCSV, openRecognizeTrackDialog } from '../redux/actions';
import { actions as appActions } from '../redux/app-feature';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as factoryNoticeDialogActions } from '../redux/factory/factory-notice-dialog-feature';
import { actions as encoderSetupDialogActions } from '../redux/encoder-setup-dialog-feature';
import { useShallowEqualSelector } from '../utils';
import Link from '@material-ui/core/Link';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Tooltip from '@material-ui/core/Tooltip';
import { makeStyles } from '@material-ui/core/styles';

import RefreshIcon from '@material-ui/icons/Refresh';
import EditIcon from '@material-ui/icons/Edit';
import GitHubIcon from '@material-ui/icons/GitHub';
import DeleteForeverIcon from '@material-ui/icons/DeleteForever';
import BugReportIcon from '@material-ui/icons/BugReport';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import InfoIcon from '@material-ui/icons/Info';
import ToggleOffIcon from '@material-ui/icons/ToggleOff';
import ToggleOnIcon from '@material-ui/icons/ToggleOn';
import MusicNoteIcon from '@material-ui/icons/MusicNote';
import Win95Icon from '../images/win95/win95.png';
import HelpIcon from '@material-ui/icons/Help';
import SettingsIcon from '@material-ui/icons/Settings';
import MusicNote from '@material-ui/icons/MusicNote';
import GetAppIcon from '@material-ui/icons/GetApp';
import PublishIcon from '@material-ui/icons/Publish';

import { W95TopMenu } from './win95/topmenu';
import { Capability } from '../services/netmd';
import { enableFactoryRippingModeInMainUi } from '../redux/factory/factory-actions';

const useStyles = makeStyles(theme => ({
    listItemIcon: {
        minWidth: theme.spacing(5),
    },
    toolTippedText: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
}));

export const TopMenu = function (props: { onClick?: () => void }) {
    const classes = useStyles();
    const dispatch = useDispatch();

    let {
        mainView,
        darkMode,
        vintageMode,
        fullWidthSupport,
        factoryModeRippingInMainUi,
        audioExportService,
        audioExportServiceConfig,
    } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities, disc } = useShallowEqualSelector(state => state.main);
    let discTitle = useShallowEqualSelector(state => state.main.disc?.title ?? ``);
    let fullWidthDiscTitle = useShallowEqualSelector(state => state.main.disc?.fullWidthTitle ?? ``);

    const githubLinkRef = React.useRef<null | HTMLAnchorElement>(null);
    const helpLinkRef = React.useRef<null | HTMLAnchorElement>(null);
    const hiddenFileInputRef = React.useRef<null | HTMLInputElement>(null);
    const [menuAnchorEl, setMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [isShiftDown, setIsShiftDown] = React.useState(false);
    const menuOpen = Boolean(menuAnchorEl);

    function themeListener() {
        const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
        colorScheme.addEventListener("change", (e) => {
            if (e.matches) {
                dispatch(appActions.setDarkMode(darkMode = true));
            } else {
                dispatch(appActions.setDarkMode(darkMode = false));
            }
        });
    };

    const isCapable = (capability: Capability) => deviceCapabilities.includes(capability);

    const handleMenuOpen = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            setIsShiftDown(event.shiftKey);
            setMenuAnchorEl(event.currentTarget);
        },
        [setMenuAnchorEl, setIsShiftDown]
    );

    const handleDarkMode = useCallback(() => {
        dispatch(appActions.setDarkMode(!darkMode));
    }, [dispatch, darkMode]);

    const handleVintageMode = useCallback(() => {
        dispatch(appActions.setVintageMode(!vintageMode));
    }, [dispatch, vintageMode]);

    const handleMenuClose = useCallback(() => {
        setMenuAnchorEl(null);
    }, [setMenuAnchorEl]);

    const handleWipeDisc = useCallback(() => {
        dispatch(wipeDisc());
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleAllowFullWidth = useCallback(() => {
        dispatch(appActions.setFullWidthSupport(!fullWidthSupport));
    }, [dispatch, fullWidthSupport]);

    const handleRefresh = useCallback(() => {
        dispatch(listContent(true));
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleRenameDisc = useCallback(() => {
        dispatch(
            batchActions([
                renameDialogActions.setVisible(true),
                renameDialogActions.setCurrentName(discTitle),
                renameDialogActions.setGroupIndex(null),
                renameDialogActions.setCurrentFullWidthName(fullWidthDiscTitle),
                renameDialogActions.setIndex(-1),
                renameDialogActions.setOfConvert(false),
            ])
        );
        handleMenuClose();
    }, [dispatch, handleMenuClose, discTitle, fullWidthDiscTitle]);

    const handleSelfTest = useCallback(() => {
        handleMenuClose();
        dispatch(selfTest());
    }, [dispatch, handleMenuClose]);

    const handleExit = useCallback(() => {
        dispatch(appActions.setMainView('WELCOME'));
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleShowAbout = useCallback(() => {
        dispatch(appActions.showAboutDialog(true));
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleEncoderSetup = useCallback(() => {
        dispatch(
            batchActions([
                encoderSetupDialogActions.setCustomParameters({ ...audioExportServiceConfig }),
                encoderSetupDialogActions.setSelectedServiceIndex(audioExportService),
                encoderSetupDialogActions.setVisible(true),
            ])
        );
        handleMenuClose();
    }, [dispatch, handleMenuClose, audioExportService, audioExportServiceConfig]);

    const handleShowChangelog = useCallback(() => {
        dispatch(appActions.showChangelogDialog(true));
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleGithubLink = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            if (event.target !== githubLinkRef.current) {
                // Prevent opening the link twice
                githubLinkRef.current?.click();
            }
            handleMenuClose();
        },
        [handleMenuClose]
    );

    const handleHelpLink = useCallback(
        (event: React.MouseEvent<HTMLElement>) => {
            event.stopPropagation();
            if (event.target !== helpLinkRef.current) {
                // Prevent opening the link twice
                helpLinkRef.current?.click();
            }
            handleMenuClose();
        },
        [handleMenuClose]
    );

    const handleEnterFactoryMode = useCallback(() => {
        dispatch(factoryNoticeDialogActions.setVisible(true));
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleToggleFactoryModeRippingInMainUi = useCallback(() => {
        if (factoryModeRippingInMainUi) {
            dispatch(appActions.setFactoryModeRippingInMainUi(false));
        } else {
            dispatch(enableFactoryRippingModeInMainUi());
        }
        handleMenuClose();
    }, [dispatch, factoryModeRippingInMainUi, handleMenuClose]);

    const handleExportCSV = useCallback(() => {
        dispatch(exportCSV());
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const handleImportCSV = useCallback(() => {
        hiddenFileInputRef.current?.click();
        handleMenuClose();
    }, [hiddenFileInputRef, handleMenuClose]);

    const handleCSVImportFromFile = useCallback(
        (event: any) => {
            const file = event.target.files[0];
            dispatch(importCSV(file));
        },
        [dispatch]
    );

    const handleOpenSongRecognition = useCallback(() => {
        dispatch(openRecognizeTrackDialog());
        handleMenuClose();
    }, [dispatch, handleMenuClose]);

    const menuItems = [];
    if (mainView === 'MAIN' && disc !== null) {
        menuItems.push(
            <MenuItem key="update" onClick={handleRefresh}>
                <ListItemIcon className={classes.listItemIcon}>
                    <RefreshIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Reload TOC</ListItemText>
            </MenuItem>
        );
        if (isCapable(Capability.factoryMode)) {
            menuItems.push(
                <MenuItem key="factoryEntry" onClick={handleEnterFactoryMode}>
                    <ListItemIcon className={classes.listItemIcon}>
                        <SettingsIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Enter Homebrew Mode</ListItemText>
                </MenuItem>
            );
        }
        menuItems.push(
            <MenuItem key="title" onClick={handleRenameDisc} disabled={!isCapable(Capability.metadataEdit)}>
                <ListItemIcon className={classes.listItemIcon}>
                    <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Rename Disc</ListItemText>
            </MenuItem>
        );
        menuItems.push(
            <MenuItem key="wipe" onClick={handleWipeDisc} disabled={!isCapable(Capability.metadataEdit)}>
                <ListItemIcon className={classes.listItemIcon}>
                    <DeleteForeverIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Wipe Disc</ListItemText>
            </MenuItem>
        );

        menuItems.push(
            <MenuItem
                key="song-recognition"
                onClick={handleOpenSongRecognition}
                disabled={!isCapable(Capability.playbackControl) || !isCapable(Capability.contentList)}
            >
                <ListItemIcon className={classes.listItemIcon}>
                    <MusicNoteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Song Recognition</ListItemText>
            </MenuItem>
        );

        menuItems.push(
            <MenuItem key="import-csv" onClick={handleImportCSV}>
                <ListItemIcon className={classes.listItemIcon}>
                    <PublishIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Import titles from CSV</ListItemText>
            </MenuItem>
        );

        menuItems.push(
            <MenuItem key="export-csv" onClick={handleExportCSV}>
                <ListItemIcon className={classes.listItemIcon}>
                    <GetAppIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Export titles to CSV</ListItemText>
            </MenuItem>
        );

        menuItems.push(
            <MenuItem key="exit" onClick={handleExit}>
                <ListItemIcon className={classes.listItemIcon}>
                    <ExitToAppIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>Exit</ListItemText>
            </MenuItem>
        );
        menuItems.push(<Divider key="action-divider" />);
        menuItems.push(
            <MenuItem key="allowFullWidth" onClick={handleAllowFullWidth}>
                <ListItemIcon className={classes.listItemIcon}>
                    {fullWidthSupport ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                </ListItemIcon>
                <ListItemText>
                    {fullWidthSupport ? `Disable ` : `Enable `}
                    <Tooltip
                        title="This advanced feature enables the use of Hiragana and Kanji alphabets. More about this in Support and FAQ."
                        arrow
                    >
                        <span className={classes.toolTippedText}>Full-Width Title Editing</span>
                    </Tooltip>
                </ListItemText>
            </MenuItem>
        );
        if (isCapable(Capability.factoryMode)) {
            menuItems.push(
                <MenuItem key="factoryUnify" onClick={handleToggleFactoryModeRippingInMainUi}>
                    <ListItemIcon className={classes.listItemIcon}>
                        {factoryModeRippingInMainUi ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
                    </ListItemIcon>
                    <ListItemText>
                        {factoryModeRippingInMainUi ? `Disable ` : `Enable `}
                        <Tooltip
                            title="This advanced feature enables RH1-style ripping from the main ui. The homebrew mode's notice still applies."
                            arrow
                        >
                            <span className={classes.toolTippedText}>Exploit Ripper</span>
                        </Tooltip>
                    </ListItemText>
                </MenuItem>
            );
        }
    }
    menuItems.push(
        <MenuItem key="darkMode" onClick={handleDarkMode}>
            <ListItemIcon className={classes.listItemIcon}>
                {/* <Switch name="darkModeSwitch" inputProps={{ 'aria-label': 'Dark Mode switch' }} size="small" /> */}
                {darkMode ? <ToggleOnIcon fontSize="small" /> : <ToggleOffIcon fontSize="small" />}
            </ListItemIcon>
            <ListItemText>Dark Mode</ListItemText>
        </MenuItem>
    );
    if (mainView === 'MAIN') {
        menuItems.push(
            <MenuItem key="vintageMode" onClick={handleVintageMode}>
                <ListItemIcon className={classes.listItemIcon}>
                    <img alt="Windows 95" src={Win95Icon} width="24px" height="24px" />
                </ListItemIcon>
                <ListItemText>Retro Mode (beta)</ListItemText>
            </MenuItem>
        );

        if (isShiftDown) {
            menuItems.push(
                <MenuItem key="test" onClick={handleSelfTest}>
                    <ListItemIcon className={classes.listItemIcon}>
                        <BugReportIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Self Test</ListItemText>
                </MenuItem>
            );
        }
    }
    if (mainView === 'MAIN') {
        menuItems.push(<Divider key="feature-divider" />);
    }
    if (mainView === 'WELCOME') {
        menuItems.push(
            <MenuItem key="encoderSetup" onClick={handleEncoderSetup}>
                <ListItemIcon className={classes.listItemIcon}>
                    <MusicNote fontSize="small" />
                </ListItemIcon>
                <ListItemText>Encoder Setup</ListItemText>
            </MenuItem>
        );
    }
    menuItems.push(
        <MenuItem key="about" onClick={handleShowAbout}>
            <ListItemIcon className={classes.listItemIcon}>
                <InfoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>About</ListItemText>
        </MenuItem>
    );
    menuItems.push(
        <MenuItem key="changelog" onClick={handleShowChangelog}>
            <ListItemIcon className={classes.listItemIcon}>
                <InfoIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Changelog</ListItemText>
        </MenuItem>
    );
    menuItems.push(
        <MenuItem key="support" onClick={handleHelpLink}>
            <ListItemIcon className={classes.listItemIcon}>
                <HelpIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
                <Link
                    rel="noopener noreferrer"
                    href="https://github.com/cybercase/webminidisc/wiki/Support-and-FAQ"
                    target="_blank"
                    ref={helpLinkRef}
                    onClick={handleHelpLink}
                >
                    Support and FAQ
                </Link>
            </ListItemText>
        </MenuItem>
    );
    menuItems.push(
        <MenuItem key="github" onClick={handleGithubLink}>
            <ListItemIcon className={classes.listItemIcon}>
                <GitHubIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>
                <Link
                    rel="noopener noreferrer"
                    href="https://github.com/DaveFlashNL/WebMDPro"
                    target="_blank"
                    ref={githubLinkRef}
                    onClick={handleGithubLink}
                >
                    Fork me on GitHub
                </Link>
            </ListItemText>
        </MenuItem>
    );
    themeListener();

    if (vintageMode) {
        const p = {
            mainView,
            onClick: props.onClick,
            handleWipeDisc,
            handleRefresh,
            handleRenameDisc,
            handleExit,
            handleShowAbout,
            handleShowChangelog,
            handleVintageMode,
            isCapable,
        };
        return <W95TopMenu {...p} />;
    }
    return (
        <React.Fragment>
            <IconButton aria-label="actions" aria-controls="actions-menu" aria-haspopup="true" onClick={handleMenuOpen}>
                <MoreVertIcon />
            </IconButton>
            <Menu id="actions-menu" anchorEl={menuAnchorEl} keepMounted open={menuOpen} onClose={handleMenuClose}>
                {menuItems}
            </Menu>
            <input type="file" ref={hiddenFileInputRef} style={{ display: 'none' }} onChange={handleCSVImportFromFile} />
        </React.Fragment>
    );
};
