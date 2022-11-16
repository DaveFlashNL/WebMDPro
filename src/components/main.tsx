import React, { useEffect, useCallback, useState } from 'react';
import { useDispatch } from 'react-redux';
import clsx from 'clsx';
import { useDropzone } from 'react-dropzone';
import {
    DragDropContext,
    Draggable,
    DraggableProvided,
    DropResult,
    ResponderProvided,
    Droppable,
    DroppableProvided,
    DroppableStateSnapshot,
} from 'react-beautiful-dnd';
import { listContent, deleteTracks, moveTrack, groupTracks, deleteGroups, dragDropTrack, ejectDisc } from '../redux/actions';
import { actions as renameDialogActions } from '../redux/rename-dialog-feature';
import { actions as convertDialogActions } from '../redux/convert-dialog-feature';
import { actions as dumpDialogActions } from '../redux/dump-dialog-feature';

import { DeviceStatus, formatTimeFromFrames, Track } from 'netmd-js';
import { control } from '../redux/actions';

import { belowDesktop, forAnyDesktop, getGroupedTracks, getSortedTracks, isSequential, useShallowEqualSelector } from '../utils';

import { lighten, makeStyles } from '@material-ui/core/styles';
import { alpha } from '@material-ui/core/styles/colorManipulator';
import Typography from '@material-ui/core/Typography';
import Box from '@material-ui/core/Box';
import Fab from '@material-ui/core/Fab';
import AddIcon from '@material-ui/icons/Add';
import DeleteIcon from '@material-ui/icons/Delete';
import EditIcon from '@material-ui/icons/Edit';
import Backdrop from '@material-ui/core/Backdrop';
import CreateNewFolderIcon from '@material-ui/icons/CreateNewFolder';
import EjectIcon from '@material-ui/icons/Eject';

import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';

import IconButton from '@material-ui/core/IconButton';
import Toolbar from '@material-ui/core/Toolbar';
import Tooltip from '@material-ui/core/Tooltip';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';
import { batchActions } from 'redux-batched-actions';

import { GroupRow, TrackRow } from './main-rows';
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
import { Capability } from '../services/netmd';
import { LinearProgress } from '@material-ui/core';
import { FactoryModeNoticeDialog } from './factory/factory-notice-dialog';
import { FactoryModeProgressDialog } from './factory/factory-progress-dialog';
import { SongRecognitionDialog } from './song-recognition-dialog';
import { SongRecognitionProgressDialog } from './song-recognition-progress-dialog';
import { isDesktopApp } from './app';

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
        marginBottom: theme.spacing(3),
        outline: 'none',
        marginLeft: theme.spacing(-1),
        marginRight: theme.spacing(-1),
        [forAnyDesktop(theme)]: {
            marginLeft: theme.spacing(-2),
            marginRight: theme.spacing(-2),
        },
    },
    toolbar: {
        marginTop: theme.spacing(2),
        marginLeft: theme.spacing(-2),
        marginRight: theme.spacing(-2),
        [theme.breakpoints.up(600 + theme.spacing(2) * 2)]: {
            marginLeft: theme.spacing(-3),
            marginRight: theme.spacing(-3),
        },
    },
    toolbarLabel: {
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
    hoveringOverGroup: {
        backgroundColor: `${alpha(theme.palette.secondary.dark, 0.4)}`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
    format: {
        ...(BadgeImpl as any).styles(theme).badge,
        ...(BadgeImpl as any).styles(theme).colorPrimary,
        position: 'static',
        display: 'inline-flex',
        border: `2px solid ${theme.palette.background.paper}`,
        padding: '0 4px',
        verticalAlign: 'middle',
        width: theme.spacing(4.5),
        marginRight: theme.spacing(0.5),
        textDecoration: 'underline',
        textDecorationStyle: 'dotted',
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
    }, [disc]);

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
        accept: [`audio/*`, `video/mp4`, `video/webm`, `.oma`, `.at3`],
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
                    renameDialogActions.setGroupIndex(null),
                    renameDialogActions.setCurrentName(track.title),
                    renameDialogActions.setCurrentFullWidthName(track.fullWidthTitle),
                    renameDialogActions.setIndex(track.index),
                    renameDialogActions.setOfConvert(false),
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
                    renameDialogActions.setGroupIndex(index),
                    renameDialogActions.setCurrentName(group.title ?? ''),
                    renameDialogActions.setCurrentFullWidthName(group.fullWidthTitle ?? ''),
                    renameDialogActions.setIndex(-1),
                    renameDialogActions.setOfConvert(false),
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

    const handleRenameDisc = useCallback(
        (event: React.MouseEvent) => {
            dispatch(
                batchActions([
                    renameDialogActions.setVisible(true),
                    renameDialogActions.setCurrentName(disc!.title),
                    renameDialogActions.setGroupIndex(null),
                    renameDialogActions.setCurrentFullWidthName(disc!.fullWidthTitle),
                    renameDialogActions.setIndex(-1),
                    renameDialogActions.setOfConvert(false),
                ])
            );
        },
        [dispatch, disc]
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

    const isCapable = (capability: Capability) => deviceCapabilities.includes(capability);

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

    return (
        <React.Fragment>
            <Box className={classes.headBox}>
                {isDesktopApp() ? (
                    <Typography component="h1" variant="h6" className={classes.headBox}>
                        Connected device: {deviceName || `Loading...`}
                    </Typography>
                ) : (
                    <Typography component="h1" variant="h4">
                        Web Minidisc Pro
                    </Typography>
                )}
                <span>
                    {isCapable(Capability.discEject) ? (
                        <IconButton
                            aria-label="actions"
                            aria-controls="actions-menu"
                            aria-haspopup="true"
                            onClick={handleEject}
                            disabled={!disc}
                        >
                            <EjectIcon />
                        </IconButton>
                    ) : null}
                    <TopMenu />
                </span>
            </Box>
            {isDesktopApp() ? (
                null
            ) : (
                <Typography component="h1" variant="h6" className={classes.headBox}>
                    Connected device: {deviceName || `Loading...`}
                </Typography>
            )}
            <Typography component="h2" variant="body2">
                {disc !== null ? (
                    <React.Fragment>
                        <span>{`Remaining time available of ${formatTimeFromFrames(disc.total, false)}:`} </span><br />
                        <span>{`${formatTimeFromFrames(disc.left, false)} of `}
                            <Tooltip
                                title={
                                    <span>{`This badge denotes both the the available space for a given recording mode as well as the mode used for the existing tracks on the disc listed below.`}</span>
                                }
                                arrow
                            >
                                <div className={classes.format}>SP</div>
                            </Tooltip>
                        </span><br />
                        <span>{`${formatTimeFromFrames(disc.left * 2, false)} of `}
                            <Tooltip
                                title={
                                    <span>{`LP2 as part of the MDLP standard, doubles the available recording time, but uses a newer codec.`}</span>
                                }
                                arrow
                            >
                                <div className={classes.format}>LP2</div>
                            </Tooltip>
                        </span><br />
                        <span>{`${formatTimeFromFrames(disc.left * 4, false)} of `}
                            <Tooltip
                                title={
                                    <span>{`LP4 (also part of MDLP) quadruples the available recording time. For both LP2 and LP4 however, you need an MDLP-capable unit to play such tracks.`}</span>
                                }
                                arrow
                            >
                                <div className={classes.format}>LP4</div>
                            </Tooltip>
                        </span>
                        <div className={classes.spacing} />
                        <LinearProgress
                            variant="determinate"
                            color={((disc.total - disc.left) * 100) / disc.total >= 90 ? 'secondary' : 'primary'}
                            value={((disc.total - disc.left) * 100) / disc.total}
                        />
                    </React.Fragment>
                ) : (
                    `No disc loaded`
                )
                }
            </Typography >
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
                    <Typography className={classes.toolbarLabel} color="inherit" variant="subtitle1">
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
                        <IconButton aria-label="delete" disabled={!isCapable(Capability.metadataEdit)} onClick={handleDeleteSelected}>
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title={canGroup ? 'Group' : ''}>
                        <IconButton
                            aria-label="group"
                            disabled={!canGroup || !isCapable(Capability.metadataEdit)}
                            onClick={handleGroupTracks}
                        >
                            <CreateNewFolderIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedCount > 0 ? (
                    <Tooltip title="Rename">
                        <IconButton
                            aria-label="rename"
                            disabled={selectedCount !== 1 || !isCapable(Capability.metadataEdit)}
                            onClick={handleRenameActionClick}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedGroupsCount > 0 ? (
                    <Tooltip title="Ungroup">
                        <IconButton
                            aria-label="ungroup"
                            disabled={!isCapable(Capability.metadataEdit)}
                            onClick={handleDeleteSelectedGroups}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}

                {selectedGroupsCount > 0 ? (
                    <Tooltip title="Rename Group">
                        <IconButton
                            aria-label="rename group"
                            disabled={!isCapable(Capability.metadataEdit) || selectedGroupsCount !== 1}
                            onClick={e => handleRenameGroup(e, selectedGroups[0])}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>
                ) : null}
            </Toolbar>
            {
                isCapable(Capability.contentList) ? (
                    <Box className={classes.main} {...getRootProps()} id="main">
                        <input {...getInputProps()} />
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell className={classes.dragHandleEmpty}></TableCell>
                                    <TableCell className={classes.indexCell}>#</TableCell>
                                    <TableCell>Title</TableCell>
                                    <TableCell align="right">Duration</TableCell>
                                </TableRow>
                            </TableHead>
                            <DragDropContext onDragEnd={handleDrop}>
                                <TableBody>
                                    {groupedTracks.map((group, index) => (
                                        <TableRow key={`${index}`}>
                                            <TableCell colSpan={4} style={{ padding: '0' }}>
                                                <Table size="small">
                                                    <Droppable droppableId={`${index}`} key={`${index}`}>
                                                        {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
                                                            <TableBody
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className={clsx({ [classes.hoveringOverGroup]: snapshot.isDraggingOver })}
                                                            >
                                                                {group.title !== null && (
                                                                    <GroupRow
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
                                Drop your Music to Upload
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

            <UploadDialog />
            <RenameDialog />
            <ErrorDialog />
            <ConvertDialog files={uploadedFiles} />
            <RecordDialog />
            <FactoryModeProgressDialog />
            <DumpDialog
                trackIndexes={selected}
                isCapableOfDownload={isCapable(Capability.trackDownload) || factoryModeRippingInMainUi}
                isExploitDownload={factoryModeRippingInMainUi}
            />
            <SongRecognitionDialog trackIndexes={selected} />
            <SongRecognitionProgressDialog />
            <FactoryModeNoticeDialog />
            <AboutDialog />
            <ChangelogDialog />
            <PanicDialog />
        </React.Fragment >
    );
};
