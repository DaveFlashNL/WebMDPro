import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import { DragDropContext, Draggable, DraggableProvided, DropResult, ResponderProvided, Droppable, DroppableProvided, DroppableStateSnapshot } from 'react-beautiful-dnd';
import { listContent, deleteTracks, moveTrack, groupTracks, deleteGroups, dragDropTrack, ejectDisc, flushDevice } from '../redux/actions';
import { actions as renameDialogActions, RenameType } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';
import { actions as appStateActions } from '../redux/app-feature';

import { DeviceStatus, formatTimeFromFrames } from 'netmd-js';
import { control } from '../redux/actions';

import { belowDesktop, forAnyDesktop, formatTimeFromSeconds, getGroupedTracks, getSortedTracks, isSequential, useShallowEqualSelector, acceptedTypes } from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import Backdrop from '@material-ui/core/Backdrop';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import EjectIcon from '@mui/icons-material/Eject';
import DoneIcon from '@mui/icons-material/Done';
import PlayCircleIcon from '@mui/icons-material/PlayCircleOutlineOutlined';
import { ReactComponent as MDLPIcon } from '../images/MDLP.svg';
import { ReactComponent as MDIcon } from '../images/minidisclogo.svg';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import LinearProgress from '@material-ui/core/LinearProgress';

import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';
import { batchActions } from 'redux-batched-actions';

import { GroupRow, leftInNondefaultCodecs, TrackRow } from './main-rows';
import { RenameDialog } from './rename-dialog';
import { UploadDialog } from './upload-dialog';
import { RecordDialog } from './record-dialog';
import { ErrorDialog } from './error-dialog';
import { PanicDialog } from './panic-dialog';
import { ConvertDialog } from './convert-dialog';
import { AboutDialog } from './about-dialog';
import { DumpDialog } from './dump-dialog';
import { TopMenu } from './topmenu';
import Checkbox from '@material-ui/core/Checkbox';
import Button from '@material-ui/core/Button';
import { W95Main } from './win95/main';
import { useMemo } from 'react';
import { ChangelogDialog } from './changelog-dialog';
import { Capability, Track } from '../services/interfaces/netmd';
import { FactoryModeNoticeDialog } from './factory/factory-notice-dialog';
import { FactoryModeProgressDialog } from './factory/factory-progress-dialog';
import { SongRecognitionDialog } from './song-recognition-dialog';
import { SongRecognitionProgressDialog } from './song-recognition-progress-dialog';
import { SettingsDialog } from './settings-dialog';
import { FactoryModeBadSectorDialog } from './factory/factory-bad-sector-dialog';
import { DiscProtectedDialog } from './disc-protected-dialog';

import { isElectron } from '../redux/main-feature';
import { lproj } from '../languages';
const txt = lproj.main;

const useStyles = makeStyles(theme => ({
    add: {
        position: 'absolute',
        bottom: theme.spacing(3),
        right: theme.spacing(3),
        [belowDesktop(theme)]: {
            bottom: theme.spacing(2),
        },
    },
    main: {
        overflowY: 'auto',
        flex: '1 1 auto',
        marginBottom: theme.spacing(5),
        outline: 'none',
        marginLeft: theme.spacing(0),
        marginRight: theme.spacing(0),
        [forAnyDesktop(theme)]: {
            marginLeft: theme.spacing(0),
            marginRight: theme.spacing(0),
        },
    },
    toolbar: {
        marginTop: theme.spacing(0),
        marginLeft: theme.spacing(2),
        marginRight: theme.spacing(2),
        [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
            marginLeft: theme.spacing(0),
            marginRight: theme.spacing(0),
        },
    },
    toolbarLabel: {
        flex: '1 1 100%',
        marginLeft: '-24px',
    },
    toolbarLabelCount: {
        flex: '1 1 100%',
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
    headBox: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    headTtl: {
        display: 'flex',
        "span": {
            display: 'inline',
        },
    },
    spacing: {
        marginTop: theme.spacing(1),
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    backdrop: {
        zIndex: theme.zIndex.drawer + 1,
        color: '#fff',
    },
    remainingTimeTooltip: {
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
    hoveringOverGroup: {
        backgroundColor: `${alpha('#8b2881', 0.4)}`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
    fixedTable: {
        tableLayout: 'fixed',
    },
    format: {
        ...(BadgeImpl as any).styles(theme).badge,
        ...(BadgeImpl as any).styles(theme).colorPrimary,
        position: 'static',
        display: 'inline-flex',
        border: `2px solid ${theme.palette.background.paper}`,
        padding: '0 2px',
        verticalAlign: 'middle',
        width: theme.spacing(4.5),
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
    },
    MDlogo: {
        verticalAlign: 'middle',
        textAlign: 'center',
        maxWidth: '27px',
        maxHeight: '25.5px',
    },
    MDLP: {
        cellSpacing: '2px',
        borderCollapse: 'collapse',
        borderSpacing: '2px',

    },
    MDLPTable: {
        marginLeft: '-1px',
        cellSpacing: '2px',
        borderCollapse: 'collapse',
        borderSpacing: '2px',
        "td": {
            padding: '2px',
        },
        "tr": {
            padding: '2px',
        },
    },
    MDLPbtn: {
        display: 'inline-flex',
        verticalAlign: 'middle',
        textAlign: 'center',
        color: "#000",
        cursor: 'pointer',
    },
    MDLPHover:
        theme.palette.type === 'light'
            ? {
                "& :hover": {
                    color: '#3f51b5',
                }
            } : {
                "& :hover": {
                    color: '#2196f3',
                }
            },
    MDLPopen: {
        transform: 'rotate(-90deg)',
    },
    MDLPclosed: {
        transform: 'rotate(90deg)',
    },
    MDLabelName: {
        fontWeight: 'bold',
    },
    aligntest: {
        alignContent: 'right',
    },
    themeFill:
        theme.palette.type === 'light'
            ? {
                color: '#000',
                fill: '#000'
            } : {
                //light color
                color: '#FFF',
                fill: '#FFF'
            },
}));

function getTrackStatus(track: Track, deviceStatus: DeviceStatus | null): 'playing' | 'paused' | 'none' {
    if (!deviceStatus || track.index !== deviceStatus.track) {
        return 'none';
    }

    if (deviceStatus.state === 'playing') {
        return 'playing';
    } else if (deviceStatus.state === 'paused') {
        return 'paused';
    } else {
        return 'none';
    }
}

export const Main = (props: {}) => {
    let dispatch = useDispatch();
    const disc = useShallowEqualSelector(state => state.main.disc);
    const flushable = useShallowEqualSelector(state => state.main.flushable);
    const deviceName = useShallowEqualSelector(state => state.main.deviceName);
    const deviceStatus = useShallowEqualSelector(state => state.main.deviceStatus);
    const deviceCapabilities = useShallowEqualSelector(state => state.main.deviceCapabilities);
    const factoryModeRippingInMainUi = useShallowEqualSelector(state => state.appState.factoryModeRippingInMainUi);
    const { vintageMode } = useShallowEqualSelector(state => state.appState);

    const [selected, setSelected] = React.useState<number[]>([]);
    const [selectedGroups, setSelectedGroups] = React.useState<number[]>([]);
    const [uploadedFiles, setUploadedFiles] = React.useState<File[]>([]);
    const [lastClicked, setLastClicked] = useState(-1);
    const [moveMenuAnchorEl, setMoveMenuAnchorEl] = React.useState<null | HTMLElement>(null);
    const [hiddenMDLPModes, setActive] = useState(true);

    const isCapable = useCallback((capability: Capability) => deviceCapabilities.includes(capability), [deviceCapabilities]);

    const handleShowMoveMenu = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            setMoveMenuAnchorEl(event.currentTarget);
        },
        [setMoveMenuAnchorEl]
    );
    const handleCloseMoveMenu = useCallback(() => {
        setMoveMenuAnchorEl(null);
    }, [setMoveMenuAnchorEl]);

    const handleMoveSelectedTrack = useCallback(
        (destIndex: number) => {
            dispatch(moveTrack(selected[0], destIndex));
            handleCloseMoveMenu();
        },
        [dispatch, selected, handleCloseMoveMenu]
    );

    const handleDrop = useCallback(
        (result: DropResult, provided: ResponderProvided) => {
            if (!result.destination) return;
            let sourceList = parseInt(result.source.droppableId),
                sourceIndex = result.source.index,
                targetList = parseInt(result.destination.droppableId),
                targetIndex = result.destination.index;
            dispatch(dragDropTrack(sourceList, sourceIndex, targetList, targetIndex));
        },
        [dispatch]
    );

    const handleShowDumpDialog = useCallback(() => {
        dispatch(dumpDialogActions.setVisible(true));
    }, [dispatch]);

    useEffect(() => {
        dispatch(listContent());
    }, [dispatch]);

    useEffect(() => {
        setSelected([]); // Reset selection if disc changes
        setSelectedGroups([]);
    }, [disc]);

    const [wasLastDiscNull, setWasLastDiscNull] = useState<boolean>(false);
    const discProtectedDialogDisabled = useShallowEqualSelector(state => state.appState.discProtectedDialogDisabled);
    useEffect(() => {
        if (disc === null && !wasLastDiscNull) {
            setWasLastDiscNull(true);
            dispatch(appStateActions.showDiscProtectedDialog(false));
        } else if (disc !== null && wasLastDiscNull && disc.writeProtected && disc.writable) {
            setWasLastDiscNull(false);
            if (!discProtectedDialogDisabled) {
                dispatch(appStateActions.showDiscProtectedDialog(true));
            }
        }
    }, [dispatch, disc, wasLastDiscNull, discProtectedDialogDisabled, setWasLastDiscNull]);

    const onDrop = useCallback(
        (acceptedFiles: File[], rejectedFiles: File[]) => {
            const bannedTypes = ['audio/mpegurl', 'audio/x-mpegurl'];
            const accepted = acceptedFiles.filter(n => !bannedTypes.includes(n.type));
            if (accepted.length > 0) {
                setUploadedFiles(accepted);
                dispatch(convertDialogActions.setVisible(true));
            }
        },
        [dispatch]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept: acceptedTypes,
        noClick: true,
    });

    const classes = useStyles();
    const tracks = useMemo(() => getSortedTracks(disc), [disc]);
    const groupedTracks = useMemo(() => getGroupedTracks(disc), [disc]);

    // Action Handlers
    const handleSelectTrackClick = useCallback(
        (event: React.MouseEvent, item: number) => {
            setSelectedGroups([]);
            if (event.shiftKey && selected.length && lastClicked !== -1) {
                let rangeBegin = Math.min(lastClicked + 1, item),
                    rangeEnd = Math.max(lastClicked - 1, item);
                let copy = [...selected];
                for (let i = rangeBegin; i <= rangeEnd; i++) {
                    let index = copy.indexOf(i);
                    if (index === -1) copy.push(i);
                    else copy.splice(index, 1);
                }
                if (!copy.includes(item)) copy.push(item);
                setSelected(copy);
            } else if (selected.includes(item)) {
                setSelected(selected.filter(i => i !== item));
            } else {
                setSelected([...selected, item]);
            }
            setLastClicked(item);
        },
        [selected, setSelected, lastClicked, setLastClicked]
    );

    const handleSelectGroupClick = useCallback(
        (event: React.MouseEvent, item: number) => {
            setSelected([]);
            if (selectedGroups.includes(item)) {
                setSelectedGroups(selectedGroups.filter(i => i !== item));
            } else {
                setSelectedGroups([...selectedGroups, item]);
            }
        },
        [selectedGroups, setSelected, setSelectedGroups]
    );

    const handleSelectAllClick = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSelectedGroups([]);
            if (selected.length < tracks.length) {
                setSelected(tracks.map(t => t.index));
            } else {
                setSelected([]);
            }
        },
        [selected, tracks, setSelected, setSelectedGroups]
    );

    const handleRenameTrack = useCallback(
        (event: React.MouseEvent, index: number) => {
            let track = tracks.find(t => t.index === index);
            if (!track) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setHimdTitle(track.title),
                    renameDialogActions.setHimdAlbum(track.album ?? ''),
                    renameDialogActions.setHimdArtist(track.artist ?? ''),
                    renameDialogActions.setCurrentName(track.title),
                    renameDialogActions.setCurrentFullWidthName(track.fullWidthTitle),
                    renameDialogActions.setIndex(track.index),
                    renameDialogActions.setRenameType(
                        track.album !== undefined || track.album !== undefined ? RenameType.HIMD : RenameType.TRACK
                    ),
                ])
            );
        },
        [dispatch, tracks]
    );

    const handleRenameGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            let group = groupedTracks.find(g => g.index === index);
            if (!group) {
                return;
            }

            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setIndex(index),
                    renameDialogActions.setCurrentName(group.title ?? ''),
                    renameDialogActions.setCurrentFullWidthName(group.fullWidthTitle ?? ''),
                    renameDialogActions.setRenameType(RenameType.GROUP),
                ])
            );
        },
        [dispatch, groupedTracks]
    );

    const handleRenameActionClick = useCallback(
        (event: React.MouseEvent) => {
            if (event.detail !== 1) return; //Event retriggering when hitting enter in the dialog
            handleRenameTrack(event, selected[0]);
        },
        [handleRenameTrack, selected]
    );

    const handleDeleteSelected = useCallback(
        (event: React.MouseEvent) => {
            dispatch(deleteTracks(selected));
        },
        [dispatch, selected]
    );

    const handleGroupTracks = useCallback(
        (event: React.MouseEvent) => {
            dispatch(groupTracks(selected));
        },
        [dispatch, selected]
    );

    const handleDeleteGroup = useCallback(
        (event: React.MouseEvent, index: number) => {
            event.stopPropagation();
            dispatch(deleteGroups([index]));
        },
        [dispatch]
    );

    const handleDeleteSelectedGroups = useCallback(
        (event: React.MouseEvent) => {
            dispatch(deleteGroups(selectedGroups));
            setSelectedGroups([]);
        },
        [dispatch, selectedGroups, setSelectedGroups]
    );

    const handleEject = useCallback(
        (event: React.MouseEvent) => {
            dispatch(ejectDisc());
        },
        [dispatch]
    );

    const handleFlush = useCallback(
        (event: React.MouseEvent) => {
            dispatch(flushDevice());
        },
        [dispatch]
    );

    const handleRenameDisc = useCallback(
        (event: React.MouseEvent) => {
            if (!isCapable(Capability.metadataEdit)) return;
            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setCurrentName(disc!.title),
                    renameDialogActions.setCurrentFullWidthName(disc!.fullWidthTitle),
                    renameDialogActions.setIndex(-1),
                    renameDialogActions.setRenameType(RenameType.DISC),
                ])
            );
        },
        [dispatch, isCapable, disc]
    );

    const handleTogglePlayPauseTrack = useCallback(
        (event: React.MouseEvent, track: number) => {
            if (!deviceStatus) {
                return;
            }
            if (deviceStatus.track !== track) {
                dispatch(control('goto', track));
                dispatch(control('play'));
            } else if (deviceStatus.state === 'playing') {
                dispatch(control('pause'));
            } else {
                dispatch(control('play'));
            }
        },
        [dispatch, deviceStatus]
    );

    const canGroup = useMemo(() => {
        return (
            tracks.filter(n => n.group === null && selected.includes(n.index)).length === selected.length &&
            isSequential(selected.sort((a, b) => a - b))
        );
    }, [tracks, selected]);

    const selectedCount = selected.length;
    const selectedGroupsCount = selectedGroups.length;
    const usesHimdTracks = isCapable(Capability.himdTitles);

    /*
    
    ## const isCapable = (capability: Capability) => deviceCapabilities.includes(capability);
    old code, isCapable instance already called for in this version. retain for trouble shooting
    
    */

    if (vintageMode) {
        const p = {
            disc,
            deviceName,

            factoryModeRippingInMainUi,

            selected,
            setSelected,
            selectedCount,

            tracks,
            uploadedFiles,
            setUploadedFiles,

            onDrop,
            getRootProps,
            getInputProps,
            isDragActive,
            open,

            moveMenuAnchorEl,
            setMoveMenuAnchorEl,

            handleShowMoveMenu,
            handleCloseMoveMenu,
            handleMoveSelectedTrack,
            handleShowDumpDialog,
            handleDeleteSelected,
            handleRenameActionClick,
            handleRenameTrack,
            handleSelectAllClick,
            handleSelectTrackClick,

            isCapable,
        };
        return <W95Main {...p} />;
    }
    const isMac = () => {
        if (navigator.userAgent.indexOf('Mac') >= 0) {
            return true;
        } else {
            return false;
        }
    }
    const hideMDLP = () => {
        let lp24 = document.getElementById("LP24");
        lp24?.toggleAttribute("hidden");
        setActive(!hiddenMDLPModes);
    }

    const convertToHumanTime = (e: number) => {
        let inputTime = e;
        let hours = Math.floor(inputTime / 3600);
        inputTime %= 3600;
        let minutes = Math.floor(inputTime / 60);
        let seconds = inputTime % 60;

        return [hours, minutes, seconds]
            .map(v => v < 10 ? "0" + v : v)
            /* uncomment to remove if no hours remain to beautify time display*/
            .filter((v, i) => v !== "00" || i > 0)
            .join(":")
    }
    const convertTimeToDiscType = (e: number) => {
        let HHMMSSToLabel = convertToHumanTime(e - 1)
        if (HHMMSSToLabel === "01:20:59") {
            return "MD80";
        } else if (HHMMSSToLabel === "01:14:59") {
            return "MD74";
        } else if (HHMMSSToLabel === "01:00:59") {
            return "MD60";
        } else {
            return HHMMSSToLabel;
        }
    }

    return (
        <React.Fragment>
            <Box className={classes.headBox}>
                {isElectron() ? (
                    <Typography component="h1" variant="h6" className={classes.headTtl}>
                        {lproj.condev}{deviceName || lproj.loadin}
                    </Typography>
                ) : (
                    <Typography component="h1" variant="h4">
                        Web Minidisc Pro
                    </Typography>
                )}
                <span>
                    {isCapable(Capability.discEject) && (
                        <IconButton
                            aria-label="actions"
                            aria-controls="actions-menu"
                            aria-haspopup="true"
                            onClick={handleEject}
                            disabled={!disc}
                        >
                            <EjectIcon />
                        </IconButton>
                    )}

                    {flushable && (
                        <Tooltip title="Commit changes">
                            <IconButton aria-label="actions" aria-controls="actions-menu" aria-haspopup="true" onClick={handleFlush}>
                                <DoneIcon />
                            </IconButton>
                        </Tooltip>
                    )}
                    <TopMenu tracksSelected={selected} />
                </span>
            </Box>
            {isElectron() ? (
                isMac() ? (null) : (<Typography component="h1" variant="h6" className={classes.headTtl}>nbsp;</Typography>)
            ) : (
                <Typography component="h1" variant="h6" className={classes.headTtl}>
                    {lproj.condev}{deviceName || lproj.loadin}
                </Typography>
            )}
            <span className={classes.aligntest}>
                <Typography component="h2" variant="body2">
                    {disc !== null ? (
                        <React.Fragment>
                            <span>{lproj.timemsg}{` `}<span className={classes.MDLabelName}>{`${convertTimeToDiscType(disc.total)}:`}</span></span><br />
                            <span style={{ textAlign: 'right', alignContent: 'right' }}>{`${convertToHumanTime(disc.left - 1)} `}{lproj.of}{` `}
                                <Tooltip
                                    title={lproj.mdlpinf
                                        //<span data-langkey="mdlpinf">This badge denotes both the the available space for a given recording mode as well as the mode used for the existing tracks on the disc listed below.</span>
                                    }
                                    arrow
                                >
                                    <div className={classes.format}>SP</div>
                                </Tooltip>&nbsp;
                                <MDIcon className={classes.MDlogo + ' ' + classes.themeFill} />&nbsp;
                                <Tooltip
                                    title={
                                        <span>{hiddenMDLPModes ? 'Hide' : 'Show'}{` MDLP-recording time.`}</span>
                                    }
                                    arrow
                                >
                                    <span className={classes.MDLPbtn + ' ' + classes.MDLPHover + ' ' + classes.themeFill} aria-label="MDLP-modes" onClick={hideMDLP}>{hiddenMDLPModes ? <PlayCircleIcon className={classes.MDLPopen} /> : <PlayCircleIcon className={classes.MDLPclosed} />}</span>
                                </Tooltip>
                            </span><br />
                            <span id="LP24" hidden={false}>
                                <table className={classes.MDLPTable}><thead><tr><td>{`${convertToHumanTime(disc.left * 2 - 2)} `}{lproj.of}{` `}
                                    <Tooltip
                                        title={
                                            <span>{lproj.mdlp2}</span>
                                            //<span>{`LP2 iss part of the MDLP standard "Long Play" and doubles the available recording time, but uses a newer codec.`}</span>
                                        }
                                        arrow
                                    >
                                        <div className={classes.format}>LP2</div>
                                    </Tooltip>
                                </td><td rowSpan={2}><Tooltip
                                    title={<span>{lproj.mdlp}</span>
                                        //<span>{`Minidisc "Long Play", introduced in September 2000, is a new encoding method for audio on MiniDisc's that offers two modes: one gives 160 minutes stereo ("LP2"), the second gives 320 minutes stereo ("LP4"). Only players labelled with the same mark such as this will playback tracks encoded in MDLP-modes, on other plays they plaback as silence.`}</span>
                                    }
                                    arrow
                                >
                                    <span className={classes.themeFill}><MDLPIcon width="50px" height="12px" /></span>
                                </Tooltip></td></tr><tr><td>{`${convertToHumanTime(disc.left * 4 - 4)}`} {lproj.of}{` `}
                                    <Tooltip
                                        title={<span>{lproj.mdlp4}</span>
                                            //<span>{`LP4 (also part of MDLP) quadruples the available recording time. For both LP2 and LP4 however, you need an MDLP-capable unit to play such tracks.`}</span>
                                        }
                                        arrow
                                    >
                                        <div className={classes.format}>LP4</div>
                                    </Tooltip>
                                </td></tr></thead></table>
                            </span>
                            <span style={{ paddingRight: '120px', }}>{hiddenMDLPModes ? <small><sup>(hh:mm:ss)</sup></small> : <small><br /><sup>(hh:mm:ss)</sup></small>}</span>
                            <hr style={{ height: '4px', lineHeight: '4px', marginTop: '-2px', visibility: 'hidden' }} />


                        </React.Fragment>
                    ) : (
                        <span>No disc loaded</span>
                    )
                    }
                </Typography>
            </span>
            <Typography component="h2" variant="body2">
                {disc !== null ? (
                    <React.Fragment>
                        <LinearProgress
                            variant="determinate"
                            color={((disc.total - disc.left) * 100) / disc.total >= 90 ? 'secondary' : 'primary'}
                            value={((disc.total - disc.left) * 100) / disc.total}
                        />
                    </React.Fragment>
                ) : (
                    <span></span>
                )
                }
            </Typography>
            <Toolbar
                className={clsx(classes.toolbar, {
                    [classes.toolbarHighlight]: selectedCount > 0 || selectedGroupsCount > 0,
                })}
            >
                {selectedCount > 0 || selectedGroupsCount > 0 ? (
                    <Checkbox
                        indeterminate={selectedCount > 0 && selectedCount < tracks.length}
                        checked={selectedCount > 0}
                        disabled={selectedGroupsCount > 0}
                        onChange={handleSelectAllClick}
                        inputProps={{ 'aria-label': 'select all tracks' }}
                    />
                ) : null}
                {selectedCount > 0 || selectedGroupsCount > 0 ? (
                    <Typography className={classes.toolbarLabelCount} color="inherit" variant="subtitle1">
                        {selectedCount || selectedGroupsCount} selected
                    </Typography>
                ) : (
                    <Typography onDoubleClick={handleRenameDisc} component="h3" variant="h6" className={classes.toolbarLabel}>
                        {disc?.fullWidthTitle && `${disc.fullWidthTitle} / `}
                        {disc ? disc?.title || `Untitled Disc` : ''}
                    </Typography>
                )}
                {selectedCount > 0 ? (
                    <React.Fragment>
                        <Tooltip title={isCapable(Capability.trackDownload) || factoryModeRippingInMainUi ? 'Download from MD' : 'Record from MD'}>
                            <Button
                                aria-label={isCapable(Capability.trackDownload) || factoryModeRippingInMainUi ? 'Download' : 'Record'}
                                onClick={handleShowDumpDialog}
                            >
                                {isCapable(Capability.trackDownload) || factoryModeRippingInMainUi ? 'Download' : 'Record'}
                            </Button>
                        </Tooltip>
                    </React.Fragment>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title="Delete">
                        <span>
                            <IconButton aria-label="delete" disabled={!isCapable(Capability.metadataEdit)} onClick={handleDeleteSelected}>
                                <DeleteIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title={canGroup ? 'Group' : ''}>
                        <span>
                            <IconButton
                                aria-label="group"
                                disabled={!canGroup || !isCapable(Capability.metadataEdit)}
                                onClick={handleGroupTracks}
                            >
                                <CreateNewFolderIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title="Rename">
                        <span>
                            <IconButton
                                aria-label="rename"
                                disabled={selectedCount !== 1 || !isCapable(Capability.metadataEdit)}
                                onClick={handleRenameActionClick}
                            >
                                <EditIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}

                {selectedGroupsCount > 0 ? (
                    <Tooltip title="Ungroup">
                        <span>
                            <IconButton
                                aria-label="ungroup"
                                disabled={!isCapable(Capability.metadataEdit)}
                                onClick={handleDeleteSelectedGroups}
                            >
                                <DeleteIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}

                {selectedGroupsCount > 0 ? (
                    <Tooltip title="Rename Group">
                        <span>
                            <IconButton
                                aria-label="rename group"
                                disabled={!isCapable(Capability.metadataEdit) || selectedGroupsCount !== 1}
                                onClick={e => handleRenameGroup(e, selectedGroups[0])}
                            >
                                <EditIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                ) : null}
            </Toolbar>
            {
                isCapable(Capability.contentList) ? (
                    <Box className={classes.main} {...getRootProps()} id="main">
                        <input {...getInputProps()} />
                        <Table size="small" className={classes.fixedTable}>
                            <TableHead>
                                <TableRow>
                                    <TableCell className={classes.dragHandleEmpty}></TableCell>
                                    <TableCell className={classes.indexCell}>#</TableCell>
                                    <TableCell>Title</TableCell>
                                    {usesHimdTracks && (
                                        <>
                                            <TableCell>Album</TableCell>
                                            <TableCell>Artist</TableCell>
                                        </>
                                    )}
                                    <TableCell align="right">Duration</TableCell>
                                </TableRow>
                            </TableHead>
                            <DragDropContext onDragEnd={handleDrop}>
                                <TableBody>
                                    {groupedTracks.map((group, index) => (
                                        <TableRow key={`${index}`}>
                                            <TableCell colSpan={4 + (usesHimdTracks ? 2 : 0)} style={{ padding: '0' }}>
                                                <Table size="small" className={classes.fixedTable}>
                                                    <Droppable droppableId={`${index}`} key={`${index}`}>
                                                        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                            <TableBody
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className={clsx({ [classes.hoveringOverGroup]: snapshot.isDraggingOver })}
                                                            >
                                                                {group.title !== null && (
                                                                    <GroupRow
                                                                        usesHimdTracks={usesHimdTracks}
                                                                        group={group}
                                                                        onRename={handleRenameGroup}
                                                                        onDelete={handleDeleteGroup}
                                                                        isSelected={selectedGroups.includes(group.index)}
                                                                        isCapable={isCapable}
                                                                        onSelect={handleSelectGroupClick}
                                                                    />
                                                                )}
                                                                {group.title === null && group.tracks.length === 0 && (
                                                                    <TableRow style={{ height: '1px' }} />
                                                                )}
                                                                {group.tracks.map((t, tidx) => (
                                                                    <Draggable
                                                                        draggableId={`${group.index}-${t.index}`}
                                                                        key={`t-${t.index}`}
                                                                        index={tidx}
                                                                        isDragDisabled={!isCapable(Capability.metadataEdit)}
                                                                    >
                                                                        {(provided: DraggableProvided) => (
                                                                            <TrackRow
                                                                                track={t}
                                                                                isHimdTrack={usesHimdTracks}
                                                                                draggableProvided={provided}
                                                                                inGroup={group.title !== null}
                                                                                isSelected={selected.includes(t.index)}
                                                                                trackStatus={getTrackStatus(t, deviceStatus)}
                                                                                onSelect={handleSelectTrackClick}
                                                                                onRename={handleRenameTrack}
                                                                                onTogglePlayPause={handleTogglePlayPauseTrack}
                                                                                isCapable={isCapable}
                                                                            />
                                                                        )}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </TableBody>
                                                        )}
                                                    </Droppable>
                                                </Table>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </DragDropContext>
                        </Table>
                        {isDragActive && isCapable(Capability.trackUpload) ? (
                            <Backdrop className={classes.backdrop} open={isDragActive}>
                                Drop music to upload to MD
                            </Backdrop>
                        ) : null}
                    </Box>
                ) : null
            }
            {
                isCapable(Capability.trackUpload) ? (
                    <Fab color="primary" aria-label="add" className={classes.add} onClick={open}>
                        <AddIcon />
                    </Fab>
                ) : null
            }

            <DiscProtectedDialog />
            <UploadDialog />
            <RenameDialog />
            <ErrorDialog />
            <ConvertDialog files={uploadedFiles} />
            <RecordDialog />
            <FactoryModeProgressDialog />
            <FactoryModeBadSectorDialog />
            <DumpDialog
                trackIndexes={selected}
                isCapableOfDownload={isCapable(Capability.trackDownload) || factoryModeRippingInMainUi}
                isExploitDownload={factoryModeRippingInMainUi}
            />
            <SongRecognitionDialog />
            <SongRecognitionProgressDialog />
            <FactoryModeNoticeDialog />
            <AboutDialog />
            <ChangelogDialog />
            <SettingsDialog />
            <PanicDialog />
        </React.Fragment >
    );
};
