import React, { useCallback, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { forAnyDesktop, forWideDesktop, useShallowEqualSelector } from '../../utils';

import { Welcome } from '../welcome';
import { Main } from '../main';
import { actions as appActions } from '../../redux/app-feature';

import { Window, WindowHeader, Button, Toolbar, Panel, Hourglass, styleReset, Anchor } from 'react95';
import { createGlobalStyle, ThemeProvider as StyledThemeProvider } from 'styled-components';
import original from 'react95/dist/themes/original';
import { TopMenu } from '../topmenu';
import { useDispatch } from 'react-redux';

import CDPlayerIconUrl from '../../images/win95/cdplayer.png';
import { WindowCloseIcon } from './common';
import { Capability } from '../../services/interfaces/netmd';

const GlobalStyles = createGlobalStyle`
${styleReset}
body {
    font-family: 'ms_sans_serif';
}
img {
    image-rendering: pixelated;
}
`;

const useStyles = (props: { showsList: boolean }) =>
    makeStyles(theme => ({
        desktop: {
            width: '100%',
            height: '100%',
            backgroundColor: 'teal',
            display: 'flex',
            justifyContent: 'center',
        },
        window: {
            display: 'flex !important', // This is needed to override the styledComponent prop :(
            flexDirection: 'column',
            width: 'auto',
            height: '100%',
            [forAnyDesktop(theme)]: {
                width: 600,
                marginLeft: 'auto',
                marginRight: 'auto',
                height: props.showsList ? 600 : 200,
                marginTop: theme.spacing(2),
            },
            [forWideDesktop(theme)]: {
                width: 700,
                height: props.showsList ? 700 : 250,
                marginTop: theme.spacing(2),
            },
        },
        loading: {
            position: 'absolute',
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        },
    }));

export const W95App = () => {
    const { mainView, loading } = useShallowEqualSelector(state => state.appState);
    const { deviceCapabilities } = useShallowEqualSelector(state => state.main);
    const classes = useStyles({ showsList: mainView === 'WELCOME' || deviceCapabilities.includes(Capability.contentList) })();

    const dispatch = useDispatch();
    const [isMenuOpen, setMenuOpen] = useState(false);

    const handleExit = useCallback(() => {
        dispatch(appActions.setMainView('WELCOME'));
    }, [dispatch]);

    const closeMenu = useCallback(() => {
        setMenuOpen(false);
    }, [setMenuOpen]);

    const toggleMenu = useCallback(() => {
        setMenuOpen(!isMenuOpen);
    }, [isMenuOpen, setMenuOpen]);

    const handleHelpClick = useCallback(() => {
        window.open('https://github.com/cybercase/webminidisc/wiki/Support-and-FAQ', '_blank');
    }, []);

    const currentTheme = original;
    const theme = {
        ...currentTheme,
        selectedTableRow: {
            background: currentTheme.hoverBackground,
            color: currentTheme.canvasTextInvert,
        },
    };

    return (
        <div className={classes.desktop}>
            <GlobalStyles />
            <StyledThemeProvider theme={theme}>
                <Window className={classes.window}>
                    <WindowHeader style={{ display: 'flex', alignItems: 'center' }}>
                        <img alt="CD Player" src={CDPlayerIconUrl} />
                        <span style={{ flex: '1 1 auto', marginLeft: '4px' }}>Web MiniDisc Pro</span>
                        {mainView === 'MAIN' ? (
                            <Button onClick={handleExit}>
                                <WindowCloseIcon />
                            </Button>
                        ) : null}
                    </WindowHeader>
                    <Toolbar>
                        <Button variant="menu" size="sm" active={isMenuOpen} onClick={toggleMenu}>
                            File
                        </Button>
                        <Button variant="menu" size="sm" onClick={handleHelpClick}>
                            Help
                        </Button>
                        {isMenuOpen ? <TopMenu onClick={closeMenu} /> : null}
                    </Toolbar>
                    <>
                        {mainView === 'WELCOME' ? <Welcome /> : null}
                        {mainView === 'MAIN' ? <Main /> : null}
                    </>
                    <Panel variant="well">
                        &nbsp;
                        {' (c) '}
                        <Anchor rel="noopener noreferrer" color="inherit" target="_blank" href="https://stefano.brilli.me/">
                            Stefano Brilli
                        </Anchor>
                        {', '}
                        <Anchor rel="noopener noreferrer" color="inherit" target="_blank" href="https://github.com/asivery/">
                            Asivery
                        </Anchor>{' '}
                        {new Date().getFullYear()}
                        {'.'}
                    </Panel>
                    {loading ? (
                        <div className={classes.loading}>
                            <Hourglass size={32} />
                        </div>
                    ) : null}
                </Window>
            </StyledThemeProvider>
        </div>
    );
};
