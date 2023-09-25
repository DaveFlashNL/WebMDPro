import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { makeStyles } from '@material-ui/core';
import Button from '@material-ui/core/Button';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import TextField from '@material-ui/core/TextField';
import Tooltip from '@material-ui/core/Tooltip';
import Typography from '@material-ui/core/Typography';
import { actions as factoryFragmentModeDialogActions } from '../../redux/factory/factory-fragment-mode-edit-dialog-feature';
import { useDispatch } from 'react-redux';
import { batchActions } from 'redux-batched-actions';
import { DiscAddress, ModeFlag } from 'netmd-tocmanip';

const useStyles = makeStyles(theme => ({
    tocTable: {
        tableLayout: 'fixed',
    },
    tocRoot: {
        marginTop: theme.spacing(2),
        marginBottom: theme.spacing(1),
    },
    tocCell: {
        padding: 0,
        border: '1px solid lightgray',
        fontFamily: 'monospace',
        textAlign: 'center',
        cursor: 'pointer',
        boxSizing: 'border-box',
        opacity: 0.7,
        fontSize: 10,
    },
    headBox: {
        display: 'flex',
        justifyContent: 'space-between',
    },
    editedFieldName: {
        marginRight: theme.spacing(2),
    },
    editedFieldDiv: {
        display: 'flex',
        alignItems: 'center',
    },
    linkInput: {
        width: 50,
    },
    modeInput: {
        width: 50,
        marginRight: theme.spacing(2),
    },
    addressInputCluster: {
        width: 50,
    },
    addressInputSector: {
        width: 25,
    },
    addressInputGroup: {
        width: 10,
    },
    cellInput: {
        width: 200,
    },
    infoText: {
        marginTop: theme.spacing(2),
    },
    dataHeaderContainer: {
        display: 'flex',
        alignItems: 'space-between',
    },
    tableHeader: {
        textAlign: 'center',
    },
    tableWrapper: {
        display: 'flex',
        flexDirection: 'column',
    },
}));

export interface DisplayableBlock {
    contents: {
        text: string;
        color: string;
    }[];
}

export const TocTable = ({
    data: input,
    showingIndices,
    onSelectionChanged,
    selectedIndex,
    highlitedIndices,
    contentCounter,
    name,
}: {
    name: string;
    data: DisplayableBlock[];
    onSelectionChanged: (index: number) => void;
    showingIndices: boolean;
    selectedIndex: number;
    highlitedIndices: number[];
    contentCounter: number;
}) => {
    let data = [...input];
    data.filter(n => n.contents.length === 0).forEach(n => n.contents.push({ text: '?', color: 'red' }));
    while (data.length < 256) data.push({ contents: [{ text: '?', color: 'red' }] });
    const classes = useStyles();
    return (
        <div className={classes.tableWrapper}>
            <Typography component="h3" variant="h6" className={classes.tableHeader}>
                {name}
            </Typography>
            <Table className={classes.tocTable}>
                <TableBody>
                    {Array(16)
                        .fill(0)
                        .map((_, i) => (
                            <TableRow key={`${name}-r${i}`}>
                                {Array(16)
                                    .fill(0)
                                    .map((_, j) => (
                                        <TableCell
                                            onClick={() => onSelectionChanged(i * 16 + j)}
                                            className={classes.tocCell}
                                            key={`${name}-r${i}-c${j}`}
                                            style={{
                                                backgroundColor:
                                                    data[i * 16 + j].contents[contentCounter % data[i * 16 + j].contents.length].color,
                                                opacity:
                                                    selectedIndex === i * 16 + j || highlitedIndices.includes(i * 16 + j) ? 1 : undefined,
                                                fontWeight: selectedIndex === i * 16 + j ? 'bold' : undefined,
                                            }}
                                        >
                                            {showingIndices
                                                ? i * 16 + j
                                                : data[i * 16 + j].contents[contentCounter % data[i * 16 + j].contents.length].text}
                                        </TableCell>
                                    ))}
                            </TableRow>
                        ))}
                </TableBody>
            </Table>
        </div>
    );
};

/*
    For table 1 - track map
    U - Unlinked,
    L - Linked (light blue)

    For table 2 - fragment list
    U - Unlinked (red)
    S - SP Audio (l. blue)
    M - SP Mono Audio (l. blue)
    L - LP Audio (l. blue)
    R - Root - Beginning of track (d. blue)
    F - Free
*/

export const ComponentOrDisabled = ({ children, disabled }: { children: JSX.Element; disabled: boolean }) => {
    return !disabled ? (
        children
    ) : (
        <Tooltip arrow title={`This feature is not supported on this device. Stay tuned for future updates!`}>
            <span>{children}</span>
        </Tooltip>
    );
};

export const LinkSelector = ({ value, setValue }: { value: number; setValue: (newValue: number) => void }) => {
    return <LabeledNumberInput value={value} setValue={setValue} name="Link" />;
};

export const LabeledNumberInput = ({
    value,
    setValue,
    name,
    bytes,
}: {
    value: number;
    setValue: (newValue: number) => void;
    name: string;
    bytes?: number;
}) => {
    const classes = useStyles();
    const maxValue = useMemo(() => Math.pow(2, 8 * (bytes ?? 1)) - 1, [bytes]);

    const [localValue, setLocalValue] = useState<typeof value>(value);
    useEffect(() => setLocalValue(value), [value]);

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            const newVal = parseInt(event.target.value || '0');
            if (isNaN(newVal) || newVal < 0 || newVal > maxValue) return;
            setLocalValue(newVal);
        },
        [setLocalValue, maxValue]
    );
    const handleFocusLost = useCallback(() => {
        if (localValue !== value) {
            setValue(localValue);
        }
    }, [localValue, value, setValue]);
    return (
        <div className={classes.editedFieldDiv}>
            <Typography variant="body2" className={classes.editedFieldName}>
                {name}:
            </Typography>
            <TextField value={localValue} onChange={handleChange} onBlur={handleFocusLost} className={classes.linkInput} />
        </div>
    );
};

export const CellInput = ({ value, setValue }: { value: string; setValue: (newValue: string) => void }) => {
    function backslashEscape(text: string) {
        let ret = '';
        for (let char of [...text]) {
            const code = char.charCodeAt(0);
            if (code > 0xff) ret += '\\00';
            // Unicode non-ascii character.
            else if (code < 0x20 || code > 0x7e) {
                ret += '\\' + code.toString(16).padStart(2, '0');
            } else if (char === '\\') {
                ret += '\\\\';
            } else {
                ret += char;
            }
        }
        return ret;
    }

    function backslashToStandard(text: string) {
        let raw = '';
        let sequence = false;
        let half = null;
        for (let char of [...text]) {
            if (char === '\\' && !sequence) {
                if (half !== null) throw new Error('Invalid sequence');
                sequence = true;
            } else if (sequence && char === '\\') {
                if (half !== null) throw new Error('Invalid sequence');
                sequence = false;
                raw += '\\';
            } else if (sequence && half === null) {
                half = char;
            } else if (sequence) {
                raw += Buffer.from([parseInt(half + char, 16)]).toString();
                half = null;
                sequence = false;
            } else {
                raw += char;
            }
        }
        if (sequence) throw new Error('Terminated mid-sequence');
        return raw;
    }

    const classes = useStyles();
    const [tempValue, setTempValue] = useState(backslashEscape(value));
    useEffect(() => setTempValue(backslashEscape(value)), [value, setTempValue]);
    const [error, setError] = useState('');
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            const newVal = event.target.value;
            let standard;
            try {
                standard = backslashToStandard(newVal);
            } catch (ex) {
                setError((ex as any).message);
                setTempValue(newVal);
                return;
            }

            if (standard.length > 7) {
                return;
            } else if (standard.length < 7) {
                setError('Please pad the text to 7');
            } else {
                setError('');
                setValue(standard);
            }
            setTempValue(newVal);
        },
        [setValue]
    );
    return (
        <div className={classes.editedFieldDiv}>
            <Typography variant="body2" className={classes.editedFieldName}>
                Contents:
            </Typography>
            <TextField value={tempValue} error={error !== ''} helperText={error} onChange={handleChange} className={classes.cellInput} />
        </div>
    );
};

export const ModeInput = ({
    value,
    setValue,
    fragmentIndex,
}: {
    value: number;
    setValue: (newValue: number) => void;
    fragmentIndex: number;
}) => {
    const classes = useStyles();
    const dispatch = useDispatch();
    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            const newVal = parseInt(event.target.value);
            if (isNaN(newVal) || newVal < 0 || newVal > 255) return;
            setValue(newVal);
        },
        [setValue]
    );

    const handleOpenModeEdit = useCallback(() => {
        dispatch(
            batchActions([
                factoryFragmentModeDialogActions.setFragmentIndex(fragmentIndex),
                factoryFragmentModeDialogActions.setMode(value),
                factoryFragmentModeDialogActions.setVisible(true),
            ])
        );
    }, [dispatch, fragmentIndex, value]);
    return (
        <div className={classes.editedFieldDiv}>
            <Typography variant="body2" className={classes.editedFieldName}>
                Mode:
            </Typography>
            <TextField value={value} onChange={handleChange} className={classes.modeInput} />
            <Typography variant="body2" className={classes.editedFieldName}>
                {Array(32)
                    .fill(0)
                    .map((_, i) => ((value & (1 << i)) !== 0 ? ModeFlag[1 << i] : null))
                    .filter(n => n !== null)
                    .join(', ')}
            </Typography>
            <Button onClick={handleOpenModeEdit}>Edit</Button>
        </div>
    );
};

export const DiscAddressInput = ({
    name,
    value,
    setValue,
}: {
    name: string;
    value: DiscAddress;
    setValue: (discAddress: DiscAddress) => void;
}) => {
    const classes = useStyles();

    const handleClusterEdit = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            let inputValue = parseInt(event.target.value || '0', 16);
            if (isNaN(inputValue)) return;
            if (inputValue > 0x3fff) return;
            setValue({ ...value, cluster: inputValue });
        },
        [setValue, value]
    );

    const handleSectorEdit = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            let inputValue = parseInt(event.target.value || '0', 16);
            if (isNaN(inputValue)) return;
            if (inputValue > 0x3f) return;
            setValue({ ...value, sector: inputValue });
        },
        [setValue, value]
    );

    const handleGroupEdit = useCallback(
        (event: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
            let inputValue = parseInt(event.target.value || '0', 16);
            if (isNaN(inputValue)) return;
            if (inputValue > 0xf) return;
            setValue({ ...value, group: inputValue });
        },
        [setValue, value]
    );

    return (
        <div className={classes.editedFieldDiv}>
            <Tooltip title="Cluster.Sector.Group" arrow>
                <Typography variant="body2" className={classes.editedFieldName}>
                    {name}:{' '}
                </Typography>
            </Tooltip>
            <TextField
                value={value.cluster.toString(16).padStart(4, '0')}
                onChange={handleClusterEdit}
                className={classes.addressInputCluster}
            />
            {'.'}
            <TextField
                value={value.sector.toString(16).padStart(2, '0')}
                onChange={handleSectorEdit}
                className={classes.addressInputSector}
            />
            {'.'}
            <TextField value={value.group.toString(16)} onChange={handleGroupEdit} className={classes.addressInputGroup} />
        </div>
    );
};
