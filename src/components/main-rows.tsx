import React, { useCallback } from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import Tooltip from '@material-ui/core/Tooltip';

import * as BadgeImpl from '@material-ui/core/Badge/Badge';

import DragIndicator from '@mui/icons-material/DragIndicator';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import IconButton from '@material-ui/core/IconButton';
import FolderIcon from '@mui/icons-material/Folder';
import DeleteIcon from '@mui/icons-material/Delete';

import { DraggableProvided } from 'react-beautiful-dnd';
import { Capability, Track, Group } from '../services/interfaces/netmd';
import { formatTimeFromSeconds, secondsToNormal } from '../utils';

import serviceRegistry from '../services/registry';


const useStyles = makeStyles(theme => ({
    currentTrackRow: {
        color: theme.palette.primary.main,
        '& > td': {
            color: 'inherit',
        },
    },
    inGroupTrackRow: {
        '& > $indexCell': {
            transform: `translateX(${theme.spacing(3)}px)`,
        },
        '& > $titleCell': {
            transform: `translateX(${theme.spacing(3)}px)`,
        },
    },
    playButtonInTrackList: {
        display: 'none',
    },
    trackRow: {
        //userSelect: 'none',
        '&:hover': {
            '& $playButtonInTrackList': {
                display: 'inline-flex',
            },
            '& $trackIndex': {
                display: 'none',
            },
        },
    },
    controlButtonInTrackCommon: {
        width: theme.spacing(2),
        height: theme.spacing(2),
        verticalAlign: 'middle',
        marginLeft: theme.spacing(-0.5),
    },
    formatBadge: {
        ...(BadgeImpl as any).styles(theme).badge,
        ...(BadgeImpl as any).styles(theme).colorPrimary,
        position: 'static',
        display: 'inline-flex',
        border: `2px solid ${theme.palette.background.paper}`,
        padding: '0 4px',
        verticalAlign: 'middle',
        width: theme.spacing(4.5),
        marginRight: theme.spacing(0.5),
    },
    channelBadge: {
        position: 'static',
        display: 'inline-flex',
        padding: '0 4px',
        verticalAlign: 'middle',
        userSelect: 'none',
        marginRight: theme.spacing(0.5),
        color: theme.palette.text.secondary,
    },
    durationCell: {
        whiteSpace: 'nowrap',
    },
    durationCellSecondary: {
        whiteSpace: 'nowrap',
        color: theme.palette.text.secondary,
    },
    durationCellTime: {
        verticalAlign: 'middle',
    },
    titleCell: {
        overflow: 'hidden',
        maxWidth: '40ch',
        textOverflow: 'ellipsis',
        // whiteSpace: 'nowrap',
    },
    deleteGroupButton: {
        display: 'none',
    },
    indexCell: {
        whiteSpace: 'nowrap',
        paddingRight: 0,
        width: theme.spacing(4),
    },
    trackIndex: {
        display: 'inline-block',
        height: '16px',
        width: '16px',
    },
    dragHandle: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
    dragHandleEmpty: {
        width: 20,
        padding: `${theme.spacing(0.5)}px 0 0 0`,
    },
    groupFolderIcon: {},
    groupHeadRow: {
        //userSelect: 'none',
        '&:hover': {
            '& $deleteGroupButton': {
                display: 'inline-flex',
            },
            '& $groupFolderIcon': {
                display: 'none',
            },
        },
    },
}));

interface TrackRowProps {
    track: Track;
    inGroup: boolean;
    isSelected: boolean;
    trackStatus: 'playing' | 'paused' | 'none';
    isHimdTrack: boolean;
    draggableProvided: DraggableProvided;
    onSelect: (event: React.MouseEvent, trackIdx: number) => void;
    onRename: (event: React.MouseEvent, trackIdx: number) => void;
    onTogglePlayPause: (event: React.MouseEvent, trackIdx: number) => void;
    isCapable: (capability: Capability) => boolean;
}

export function TrackRow({
    track,
    inGroup,
    isSelected,
    draggableProvided,
    trackStatus,
    isHimdTrack,
    onSelect,
    onRename,
    onTogglePlayPause,
    isCapable,
}: TrackRowProps) {
    const classes = useStyles();

    const handleRename = useCallback(event => isCapable(Capability.metadataEdit) && onRename(event, track.index), [
        track.index,
        onRename,
        isCapable,
    ]);
    const handleSelect = useCallback(event => onSelect(event, track.index), [track.index, onSelect]);
    const handlePlayPause: React.MouseEventHandler = useCallback(
        event => {
            event.stopPropagation();
            onTogglePlayPause(event, track.index);
        },
        [track.index, onTogglePlayPause]
    );
    const handleDoubleClickOnPlayButton: React.MouseEventHandler = useCallback(event => event.stopPropagation(), []);
    const isPlayingOrPaused = trackStatus === 'playing' || trackStatus === 'paused';

    return (
        <TableRow
            {...draggableProvided.draggableProps}
            ref={draggableProvided.innerRef}
            hover
            selected={isSelected}
            onDoubleClick={handleRename}
            onClick={handleSelect}
            color="inherit"
            className={clsx({
                [classes.trackRow]: isCapable(Capability.playbackControl),
                [classes.inGroupTrackRow]: inGroup,
                [classes.currentTrackRow]: isPlayingOrPaused,
            })

            }
        >
            <TableCell className={classes.dragHandle} {...draggableProvided.dragHandleProps} onClick={event => event.stopPropagation()}>
                <DragIndicator fontSize="small" color="disabled" />
            </TableCell>
            <TableCell className={classes.indexCell}>
                <span className={classes.trackIndex}>{track.index + 1}</span>
                <IconButton
                    aria-label="play/pause"
                    className={clsx(classes.controlButtonInTrackCommon, classes.playButtonInTrackList)}
                    size="small"
                    onClick={handlePlayPause}
                    onDoubleClick={handleDoubleClickOnPlayButton}
                >
                    {trackStatus === 'paused' || trackStatus === 'none' ? (
                        <PlayArrowIcon fontSize="inherit" />
                    ) : (
                        <PauseIcon fontSize="inherit" />
                    )}
                </IconButton>
            </TableCell>
            <TableCell className={classes.titleCell} title={track.title ?? ''}>
                {track.fullWidthTitle ? `${track.fullWidthTitle} / ` : ``}
                {track.title || `No Title`}
            </TableCell>
            {isHimdTrack && (
                <>
                    <TableCell className={classes.titleCell} title={track.album ?? ''}>
                        {track.album || `No Album`}
                    </TableCell>
                    <TableCell className={classes.titleCell} title={track.artist ?? ''}>
                        {track.artist || `No Artist`}
                    </TableCell>
                </>
            )}
            <TableCell align="right" className={classes.durationCell}>
                {track.encoding.codec === 'SP' && track.channel === 1 && <span className={classes.channelBadge}>MONO</span>}
                {track.encoding.bitrate ? (
                    <Tooltip title={`${track.encoding.bitrate!} kbps`}>
                        <span className={classes.formatBadge}>{track.encoding.codec}</span>
                    </Tooltip>
                ) : (
                    <span className={classes.formatBadge}>{track.encoding.codec}</span>
                )}
                <span className={classes.durationCellTime}>{formatTimeFromSeconds(track.duration)}</span>
            </TableCell>
        </TableRow>
    );
}

interface GroupRowProps {
    group: Group;
    usesHimdTracks?: boolean;
    onRename: (event: React.MouseEvent, groupIdx: number) => void;
    onDelete: (event: React.MouseEvent, groupIdx: number) => void;
    onSelect: (event: React.MouseEvent, groupIdx: number) => void;
    isCapable: (c: Capability) => boolean;
    isSelected: boolean;
}

export function GroupRow({ group, usesHimdTracks, onRename, onDelete, isCapable, onSelect, isSelected }: GroupRowProps) {
    const classes = useStyles();

    const handleDelete = useCallback((event: React.MouseEvent) => isCapable(Capability.metadataEdit) && onDelete(event, group.index), [
        onDelete,
        group,
        isCapable,
    ]);
    const handleRename = useCallback((event: React.MouseEvent) => isCapable(Capability.metadataEdit) && onRename(event, group.index), [
        onRename,
        group,
        isCapable,
    ]);
    const handleSelect = useCallback((event: React.MouseEvent) => onSelect(event, group.index), [onSelect, group]);
    return (
        <TableRow
            hover
            selected={isSelected}
            className={clsx({ [classes.groupHeadRow]: isCapable(Capability.metadataEdit) })}
            onDoubleClick={handleRename}
            onClick={handleSelect}
        >
            <TableCell className={classes.dragHandleEmpty}></TableCell>
            <TableCell className={classes.indexCell}>
                <FolderIcon className={clsx(classes.controlButtonInTrackCommon, classes.groupFolderIcon)} fontSize="inherit" />
                <IconButton
                    aria-label="delete"
                    className={clsx(classes.controlButtonInTrackCommon, classes.deleteGroupButton)}
                    size="small"
                    onClick={handleDelete}
                >
                    <DeleteIcon fontSize="inherit" />
                </IconButton>
            </TableCell>
            <TableCell className={classes.titleCell} title={group.title!}>
                {group.fullWidthTitle ? `${group.fullWidthTitle} / ` : ``}
                {group.title || `No Name`}
            </TableCell>
            {usesHimdTracks && (
                <>
                    <TableCell />
                    <TableCell />
                </>
            )}
            <TableCell align="right" className={classes.durationCellSecondary}>
                <span className={classes.durationCellTime}>
                    {formatTimeFromSeconds(group.tracks.map(n => n.duration).reduce((a, b) => a + b))}
                </span>
            </TableCell>
        </TableRow>
    );
}

export function leftInNondefaultCodecs(timeLeft: number) {
    const minidiscSpec = serviceRegistry.netmdSpec;
    if (!minidiscSpec) {
        return (<></>);
    }
    return (
        <React.Fragment>
            {minidiscSpec.availableFormats.map(e =>
                e.codec === minidiscSpec.defaultFormat.codec ? null : (
                    <React.Fragment key={`total-${e.codec}`}>
                        <span>{`${secondsToNormal(
                            minidiscSpec.translateDefaultMeasuringModeTo(
                                {
                                    codec: e.codec,
                                    bitrate: e.availableBitrates
                                        ? e.defaultBitrate ?? Math.max(...e.availableBitrates)
                                        : undefined,
                                },
                                timeLeft
                            )
                        )} in ${e.codec} Mode`}</span>
                        <br />
                    </React.Fragment>
                )
            )}
        </React.Fragment>
    )
}