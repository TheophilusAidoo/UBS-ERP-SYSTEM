import React, { useState } from 'react';
import {
  Button,
  Menu,
  MenuItem,
  Box,
} from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/language.store';
import { LANGUAGES } from '../../constants';
import { Language } from '../../types';

interface LanguageSwitcherProps {
  variant?: 'text' | 'outlined' | 'contained';
  sx?: any;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ variant = 'outlined', sx }) => {
  const { currentLanguage, setLanguage } = useLanguageStore();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const currentLang = LANGUAGES.find((l) => l.code === currentLanguage);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = async (lang: Language) => {
    await setLanguage(lang);
    handleClose();
  };

  return (
    <Box>
      <Button
        variant={variant}
        startIcon={<TranslateIcon />}
        onClick={handleClick}
        sx={sx}
      >
        {currentLang?.nativeName || currentLanguage.toUpperCase()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
      >
        {LANGUAGES.map((lang) => (
          <MenuItem
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            selected={currentLanguage === lang.code}
          >
            {lang.nativeName}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default LanguageSwitcher;
