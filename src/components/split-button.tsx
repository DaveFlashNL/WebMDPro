import * as React from 'react';
import Button from '@material-ui/core/Button';
import ButtonGroup from '@material-ui/core/ButtonGroup';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ClickAwayListener from '@material-ui/core/ClickAwayListener';
import Grow from '@material-ui/core/Grow';
import Paper from '@material-ui/core/Paper';
import Popper from '@material-ui/core/Popper';
import MenuItem from '@material-ui/core/MenuItem';
import MenuList from '@material-ui/core/MenuList';
import { ButtonProps } from '@material-ui/core/Button';

export type OptionType = {
    name: string;
    handler: () => void;
    switchTo: boolean;
} & any;

export type SplitButtonProps = {
    options: OptionType[];
    boxClassName?: string;
    width?: number;
    selectedIndex?: number;
    dropdownMapping?: (option: OptionType) => any;
} & ButtonProps;

export default function SplitButton(props: SplitButtonProps) {
    const [open, setOpen] = React.useState(false);
    const anchorRef = React.useRef<HTMLDivElement>(null);

    const { options, boxClassName, width, selectedIndex: initialSelected, dropdownMapping, ...buttonProps } = props;

    const [selectedIndex, setSelectedIndex] = React.useState(initialSelected || 0);

    const handleMenuItemClick = (event: React.MouseEvent<HTMLLIElement, MouseEvent>, index: number) => {
        if (options[index].switchTo) {
            setSelectedIndex(index);
        }
        options[index].handler();
        setOpen(false);
    };

    const handleToggle = () => {
        setOpen(prevOpen => !prevOpen);
    };

    const handleClose = (event: React.MouseEvent<Document, MouseEvent>) => {
        if (anchorRef.current && anchorRef.current.contains(event.target as HTMLElement)) {
            return;
        }

        setOpen(false);
    };

    return (
        <div className={boxClassName}>
            <ButtonGroup variant="contained" ref={anchorRef} aria-label="split button">
                <Button {...buttonProps} onClick={options[selectedIndex].handler} style={{ minWidth: width ? width * 0.8 : undefined }}>
                    {options[selectedIndex].name}
                </Button>
                <Button
                    size="small"
                    aria-controls={open ? 'split-button-menu' : undefined}
                    aria-expanded={open ? 'true' : undefined}
                    aria-label="select merge strategy"
                    aria-haspopup="menu"
                    onClick={handleToggle}
                    style={{ minWidth: width ? width * 0.2 : undefined }}
                >
                    <ArrowDropDownIcon />
                </Button>
            </ButtonGroup>
            <Popper
                open={open}
                anchorEl={anchorRef.current}
                role={undefined}
                style={{ zIndex: 1000, minWidth: width }}
                transition
                disablePortal
            >
                {({ TransitionProps, placement }) => (
                    <Grow
                        {...TransitionProps}
                        style={{
                            transformOrigin: placement === 'bottom' ? 'center top' : 'center bottom',
                        }}
                    >
                        <Paper>
                            <ClickAwayListener onClickAway={handleClose}>
                                <MenuList id="split-button-menu" style={{ width: '100%' }}>
                                    {options.map((option, index) => (
                                        <MenuItem
                                            key={`${index}-connect-button`}
                                            selected={index === selectedIndex}
                                            onClick={event => handleMenuItemClick(event, index)}
                                        >
                                            {dropdownMapping ? dropdownMapping(option) : option.name}
                                        </MenuItem>
                                    ))}
                                </MenuList>
                            </ClickAwayListener>
                        </Paper>
                    </Grow>
                )}
            </Popper>
        </div>
    );
}
