import React, { useCallback } from 'react';
import clsx from 'clsx';

import { EncodingName } from '../utils';

import { formatTimeFromFrames, Track, Group, Channels } from 'netmd-js';

import { makeStyles } from '@material-ui/core/styles';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import * as BadgeImpl from '@material-ui/core/Badge/Badge';

import DragIndicator from '@material-ui/icons/DragIndicator';
import PlayArrowIcon from '@material-ui/icons/PlayArrow';
import PauseIcon from '@material-ui/icons/Pause';
import IconButton from '@material-ui/core/IconButton';
import FolderIcon from '@material-ui/icons/Folder';
import DeleteIcon from '@material-ui/icons/Delete';

import { DraggableProvided } from 'react-beautiful-dnd';
import { Capability } from '../services/netmd';

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
            })}
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
            <TableCell align="right" className={classes.durationCell}>
                {EncodingName[track.encoding] === 'SP' && track.channel === Channels.mono && (
                    <span className={classes.channelBadge}>MONO</span>
                )}
                <span className={classes.formatBadge}>{EncodingName[track.encoding]}</span>
                <span className={classes.durationCellTime}>{formatTimeFromFrames(track.duration, false)}</span>
            </TableCell>
        </TableRow>
    );
}

interface GroupRowProps {
    group: Group;
    onRename: (event: React.MouseEvent, groupIdx: number) => void;
    onDelete: (event: React.MouseEvent, groupIdx: number) => void;
    onSelect: (event: React.MouseEvent, groupIdx: number) => void;
    isCapable: (c: Capability) => boolean;
    isSelected: boolean;
}

export function GroupRow({ group, onRename, onDelete, isCapable, onSelect, isSelected }: GroupRowProps) {
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
                <FolderIcon className={clsx(classes.controlButtonInTrackCommon, classes.groupFolderIcon)} />
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
            <TableCell align="right" className={classes.durationCellSecondary}>
                <span className={classes.durationCellTime}>
                    {formatTimeFromFrames(
                        group.tracks.map(n => n.duration).reduce((a, b) => a + b),
                        false
                    )}
                </span>
            </TableCell>
        </TableRow>
    );
}
