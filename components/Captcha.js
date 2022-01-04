import React from 'react';
import PropTypes from 'prop-types';
import HCaptcha from '@hcaptcha/react-hcaptcha';
import * as Sentry from '@sentry/browser';
import { toUpper } from 'lodash';
import { FormattedMessage } from 'react-intl';

import { getEnvVar } from '../lib/env-utils';
import useRecaptcha from '../lib/hooks/useRecaptcha';
import { parseToBoolean } from '../lib/utils';

import { Box } from './Grid';
import StyledCheckbox from './StyledCheckbox';
import { TOAST_TYPE, useToasts } from './ToastProvider';

export const PROVIDERS = {
  HCAPTCHA: 'HCAPTCHA',
  RECAPTCHA: 'RECAPTCHA',
};

const CAPTCHA_PROVIDER = PROVIDERS[toUpper(getEnvVar('CAPTCHA_PROVIDER'))] || PROVIDERS.HCAPTCHA;

export const isCaptchaEnabled = () => {
  return parseToBoolean(getEnvVar('CAPTCHA_ENABLED'));
};

const ReCaptcha = ({ onVerify, onError, ...props }) => {
  const { verify } = useRecaptcha();
  const [loading, setLoading] = React.useState(false);
  const [verified, setVerified] = React.useState(false);
  const { addToast } = useToasts();
  const handleClick = async () => {
    setLoading(true);
    try {
      const token = await verify();
      if (token) {
        onVerify({ token });
        setVerified(true);
      }
    } catch (e) {
      addToast({ type: TOAST_TYPE.ERROR, message: e.message });
      onError?.(e);
    }
    setLoading(false);
  };
  return (
    <StyledCheckbox
      checked={verified}
      onChange={handleClick}
      isLoading={loading}
      size={18}
      label={
        verified ? (
          <FormattedMessage id="Captcha.Button.Verified" defaultMessage="Verified Human." />
        ) : (
          <FormattedMessage id="Captcha.Button.Verify" defaultMessage="I'm not a Robot." />
        )
      }
      {...props}
      disabled={verified}
    />
  );
};

ReCaptcha.propTypes = {
  onVerify: PropTypes.func,
  onError: PropTypes.func,
};

// eslint-disable-next-line react/display-name
const Captcha = React.forwardRef(({ onVerify, provider, ...props }, captchaRef) => {
  const HCAPTCHA_SITEKEY = getEnvVar('HCAPTCHA_SITEKEY');
  const RECAPTCHA_SITE_KEY = getEnvVar('RECAPTCHA_SITE_KEY');
  const handleVerify = obj => {
    onVerify({ ...obj, provider });
  };
  const handleError = err => {
    Sentry.captureException(err);
  };

  React.useEffect(() => {
    onVerify(null);
  }, []);

  if (!isCaptchaEnabled()) {
    return null;
  }

  let captcha = null;
  if (provider === PROVIDERS.HCAPTCHA && HCAPTCHA_SITEKEY) {
    captcha = (
      <HCaptcha
        ref={captchaRef}
        sitekey={HCAPTCHA_SITEKEY}
        onVerify={token => handleVerify({ token })}
        onError={handleError}
      />
    );
  } else if (provider === PROVIDERS.RECAPTCHA && RECAPTCHA_SITE_KEY) {
    captcha = <ReCaptcha onVerify={handleVerify} onError={handleError} {...props} />;
  }
  return <Box data-cy="captcha">{captcha}</Box>;
});

Captcha.propTypes = {
  onVerify: PropTypes.func,
  provider: PropTypes.string,
};

Captcha.defaultProps = {
  provider: CAPTCHA_PROVIDER,
};

export default Captcha;
