import { useCallback, useState, useContext, useEffect } from 'react'
import Big from 'big.js'
import { useWeb3React } from '@web3-react/core'
import Layout from '../components/Layout'
import useTranslation from 'next-translate/useTranslation'
import Input from '../components/Input'
import Button from '../components/Button'
import PureContext from '../components/context/Pure'
import { fromUnit, toUnit, toFixed } from '../utils'
import { useRegisterToken } from '../hooks/useRegisterToken'
import { useBalance } from '../hooks/useBalance'
import vesperMetadata from 'vesper-metadata'

import { isAddress, isHexStrict } from 'web3-utils'
import { useRouter } from 'next/router'
import { util } from 'erc-20-lib'
import debounce from 'lodash.debounce'

const Operation = {
  Wrap: 1,
  Unwrap: 2
}

const extraTokens = [].concat(
  vesperMetadata.pools.map((p) => ({ ...p, symbol: p.name })),
  vesperMetadata.tokens
)

const useTemporalMessage = function () {
  const state = useState()
  const [text, setText] = state
  useEffect(
    function () {
      if (!text) {
        return
      }
      const CLEANUP_TEXT_MS = 5000
      const timeoutId = setTimeout(() => setText(undefined), CLEANUP_TEXT_MS)
      return () => clearTimeout(timeoutId)
    },
    [text, setText]
  )

  return state
}

// const useTokenInput = function (address, onChange, allowAnyAddress) {
//   const { t } = useTranslation('common')
//   const { active, chainId, library } = useWeb3React()
//   const { erc20 } = useContext(PureContext)

//   const [tokenAddress, setTokenAddress] = useState('')
//   const [tokenError, setTokenError] = useState('')
//   const [tokenName, setTokenName] = useState('')

//   useEffect(() => {
//     onChange(null)
//     setTokenAddress('')
//     setTokenName('')
//     setTokenError('')
//   }, [active, chainId])

//   const delayedGetTokenInfo = useCallback(
//     debounce(function (value) {
//       setTokenError('')

//       const addressPromise = isAddress(value)
//         ? Promise.resolve(value)
//         : Promise.resolve(
//             util.tokenAddress(value, extraTokens) ||
//               library.eth.ens
//                 .getAddress(value)
//                 .catch((err) => console.log(err) || null)
//           )

//       addressPromise.then(function (addressFound) {
//         if (!addressFound) {
//           setTokenError(
//             isHexStrict(value) ? t('invalid-address') : t('address-not-found')
//           )
//           onChange(null)
//           return
//         }

//         setTokenAddress(addressFound)

//         const contract = erc20(addressFound)
//         contract
//           .getInfo()
//           .then(function (info) {
//             onChange(info)
//             setTokenName(info.name)
//           })
//           .catch(function () {
//             if (allowAnyAddress) {
//               setTokenName('')
//               onChange({ address: addressFound })
//               return
//             }
//             setTokenError(t('invalid-token-address'))
//           })
//       })
//     }, 1000),
//     [erc20]
//   )

//   const handleChange = function (e) {
//     const { value } = e.target

//     const re = /^[0-9a-zA-Z.]*$/
//     if (!re.test(e.target.value)) {
//       return
//     }

//     setTokenAddress(value)
//     setTokenName('')
//     setTokenError('')

//     delayedGetTokenInfo(value)
//   }

//   useEffect(
//     function () {
//       if (!address || !erc20) {
//         return
//       }
//       handleChange({ target: { value: address } })
//     },
//     [address, erc20]
//   )

//   return {
//     caption: tokenError || tokenName,
//     captionColor: tokenError && 'text-red-600',
//     disabled: !active,
//     onChange: handleChange,
//     value: tokenAddress
//   }
// }

const useMetapoolInput = function (address, onChange, allowAnyAddress) {
  const { t } = useTranslation('common')
  const { active, chainId, library } = useWeb3React()
  const { erc20 } = useContext(PureContext)

  const [metapoolAddress, setMetapoolAddress] = useState('')
  const [metapoolError, setMetapoolError] = useState('')
  const [metapoolName, setMetapoolName] = useState('')

  useEffect(() => {
    onChange(null)
    setMetapoolAddress('')
    setMetapoolName('')
    setMetapoolError('')
  }, [active, chainId])

  const delayedGetTokenInfo = useCallback(
    debounce(function (value) {
      setMetapoolError('')

      const addressPromise = Promise.resolve(isAddress(value))
        ? Promise.resolve(value)
        : Promise.resolve(
            util.tokenAddress(value, extraTokens) ||
              library.eth.ens
                .getAddress(value)
                .catch((err) => console.log(err) || null)
          )

      addressPromise.then(function (addressFound) {
        if (!addressFound) {
          setMetapoolError(
            isHexStrict(value) ? t('invalid-metapool') : t('address-not-found')
          )
          onChange(null)
          return
        }
        setMetapoolAddress(addressFound)

        const contract = erc20(addressFound)
        setMetapoolName(addressFound)

        // search balances in metapool for current metapool
        // use search method in metapool
        // get current balance

        contract
          .getInfo()
          .then(function (info) {
            onChange(info)
            setMetapoolName(info.name)
          })
          .catch(function () {
            if (allowAnyAddress) {
              setMetapoolName('')
              onChange({ address: addressFound })
              return
            }
            // setMetapoolError(t('invalid-token-address')) // unneeded now, since mp aren't named
          })
      })
    }, 1000),
    [erc20]
  )

  const handleChange = function (e) {
    const { value } = e.target

    const re = /^[0-9a-zA-Z.]*$/
    if (!re.test(e.target.value)) {
      return
    }

    setMetapoolAddress(value)
    setMetapoolName('')
    setMetapoolError('')

    delayedGetTokenInfo(value)
  }

  useEffect(
    function () {
      if (!address || !erc20) {
        return
      }
      handleChange({ target: { value: address } })
    },
    [address, erc20]
  )

  return {
    caption: metapoolError || metapoolName,
    captionColor: metapoolError && 'text-red-600',
    disabled: !active,
    onChange: handleChange,
    value: metapoolAddress
  }
}

const CurveMetapools = function () {
  const { active, account } = useWeb3React()
  const { erc20 } = useContext(PureContext)
  const [operation, setOperation] = useState(Operation.Wrap)
  const {
    data: ethBalance,
    isLoading: isLoadingEthBalance,
    mutate: reloadEthBalance
  } = useBalance({ symbol: 'ETH' })
  const {
    data: wEthBalance,
    isLoading: isLoadingWethBalance,
    mutate: reloadWethBalance
  } = useBalance({ symbol: 'WETH' })
  const [value, setValue] = useState('')
  const { t } = useTranslation('common')
  const { query } = useRouter()
  const [token, setToken] = useState(null)

  //  const tokenInput = useTokenInput(query.token, setToken)
  const metapoolInput = useMetapoolInput(query.token, setToken)
  const registerToken = useRegisterToken({ symbol: 'WETH' })
  const [errorMessage, setErrorMessage] = useTemporalMessage()
  const [successMessage, setSuccessMessage] = useTemporalMessage()
  const isValidNumber =
    value !== '' &&
    /^(0|[1-9]\d*)(\.\d+)?$/.test(value) &&
    Big(value).gt(Big(0))

  const valueInWei = Big(toUnit(isValidNumber ? value : 0)).toFixed(0)
  const isWrapping = operation === Operation.Wrap

  const handleSubmit = function (e) {
    e.preventDefault()
    if (!active || !isValidNumber) {
      return
    }

    const erc20Service = erc20(account)

    if (isWrapping) {
      return erc20Service
        .wrapEther(valueInWei)
        .then(() => {
          setSuccessMessage(t('wrap-eth-success', { value }))
          setValue('')
        })
        .then(() =>
          Promise.all([
            registerToken(),
            reloadEthBalance(),
            reloadWethBalance()
          ])
        )
        .catch((err) => setErrorMessage(err.message))
    }

    return erc20Service
      .unwrapEther(valueInWei)
      .then(() => {
        setSuccessMessage(t('unwrap-weth-success', { value }))
        setValue('')
        return Promise.all([reloadEthBalance(), reloadWethBalance()])
      })
      .catch((err) => setErrorMessage(err.message))
  }

  const getBalanceCaption = function ({ balance = '0', isLoading, symbol }) {
    if (!active) {
      return null
    }
    if (isLoading) {
      return t('loading-balance')
    }
    const Decimals = 6
    return t('your-balance-is', {
      balance: Big(balance).gt(0) ? toFixed(fromUnit(balance), Decimals) : '0',
      symbol
    })
  }

  // const userToken = 'Token 1' // get from wallet
  const lpToken = 'Token 2' // get from wallet
  const canWrap = Big(ethBalance ? ethBalance : '0').gt(valueInWei)
  const canUnwrap = Big(wEthBalance ? wEthBalance : '-1').gte(valueInWei)

  const isWrapDisabled = operation === Operation.Wrap
  const isUnwrapDisabled = operation === Operation.Unwrap

  const wrapCaption = {
    balance: ethBalance,
    symbol: 'ETH',
    isLoading: isLoadingEthBalance
  }
  const unwrapCaption = {
    balance: wEthBalance,
    symbol: 'WETH',
    isLoading: isLoadingWethBalance
  }

  return (
    <Layout title={t('curve-metapools')} walletConnection>
      <form
        className="flex flex-col items-center w-full max-w-lg mx-auto"
        onSubmit={handleSubmit}
      >
        <div className="w-full h-24">
          <Input
            placeholder={t('metapool-placeholder')} // searchn't
            title={`${t('metapool-address')}:`}
            {...metapoolInput}
          />
        </div>

        <div className="flex justify-center w-full my-7">
          <button
            className={`w-full capitalize h-10 border-b ${
              isWrapDisabled
                ? 'bg-gray-800 text-white cursor-not-allowed'
                : 'hover:bg-gray-800 hover:text-white'
            }`}
            disabled={isWrapDisabled}
            onClick={() => setOperation(Operation.Wrap)}
          >
            {t('add-liquidity')}
          </button>
          <button
            className={`w-full capitalize h-10 border-b ${
              isUnwrapDisabled
                ? 'bg-gray-800 text-white cursor-not-allowed'
                : 'hover:bg-gray-800 hover:text-white'
            }`}
            disabled={isUnwrapDisabled}
            onClick={() => setOperation(Operation.Unwrap)}
          >
            {t('remove-liquidity')}
          </button>
        </div>

        <div className="w-full h-24">
          <Input
            caption={getBalanceCaption(
              isWrapping ? wrapCaption : unwrapCaption
            )}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('token1-placeholder')}
            suffix={token}
            value={value}
          />
        </div>

        <div className="w-full mb-7">
          <Input
            caption={getBalanceCaption(
              isWrapping ? wrapCaption : unwrapCaption
            )}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t('token2-placeholder')}
            suffix={lpToken}
            value={value}
          />
        </div>
        {/* <div className="w-full">
          <Input
            caption={getBalanceCaption(
              isWrapping ? unwrapCaption : wrapCaption
            )}
            disabled
            suffix={destinyToken}
            title={t('you-will-get')}
            value={value || '-'}
          />
        </div> */}
        <Button
          className="uppercase mt-7.5"
          disabled={
            !active ||
            !isValidNumber ||
            (operation === Operation.Wrap && !canWrap) ||
            (operation === Operation.Unwrap && !canUnwrap)
          }
        >
          {t(operation === Operation.Wrap ? 'deposit' : 'withdraw')}
        </Button>
      </form>
      {!!errorMessage && (
        <p className="mt-6 text-sm text-center text-red-600">{errorMessage}</p>
      )}
      {!!successMessage && (
        <p className="mt-6 text-sm text-center text-green-400">
          {successMessage}
        </p>
      )}
    </Layout>
  )
}

export const getStaticProps = () => ({})
export default CurveMetapools
