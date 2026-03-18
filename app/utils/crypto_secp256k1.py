import hashlib
from ecdsa import SigningKey, SECP256k1, VerifyingKey
from ecdsa.util import sigencode_string, sigdecode_string


def sha256(data: bytes) -> bytes:
    return hashlib.sha256(data).digest()


def pubkey_from_privkey_hex(priv_hex: str) -> str:
    sk = SigningKey.from_string(bytes.fromhex(priv_hex), curve=SECP256k1)
    vk: VerifyingKey = sk.get_verifying_key()
    # compressed pubkey (33 bytes): 02/03 + x
    x = vk.pubkey.point.x()
    y = vk.pubkey.point.y()
    prefix = b'\x03' if (y & 1) else b'\x02'
    return (prefix + x.to_bytes(32, 'big')).hex()


def sign_compact(priv_hex: str, msg: bytes) -> str:
    """Returns compact signature hex (64 bytes r||s) over sha256(msg)."""
    sk = SigningKey.from_string(bytes.fromhex(priv_hex), curve=SECP256k1)
    digest = sha256(msg)
    sig = sk.sign_digest(digest, sigencode=sigencode_string)
    return sig.hex()


def verify_compact(pubkey_hex_compressed: str, msg: bytes, sig_hex: str) -> bool:
    """Verify a compact signature (64 bytes r||s) over sha256(msg) using a compressed public key."""
    try:
        pubkey_bytes = bytes.fromhex(pubkey_hex_compressed)

        # Support both compressed (33 bytes) and uncompressed (64/65 bytes) public keys
        if len(pubkey_bytes) == 33:
            # Compressed key: decompress by recovering the y-coordinate from the curve
            prefix = pubkey_bytes[0]
            if prefix not in (0x02, 0x03):
                return False
            x = int.from_bytes(pubkey_bytes[1:], 'big')

            # secp256k1 curve: y^2 = x^3 + 7 (mod p)
            p = SECP256k1.curve.p()
            y_sq = (pow(x, 3, p) + 7) % p
            y = pow(y_sq, (p + 1) // 4, p)

            # Choose the correct y based on the prefix parity
            if (y & 1) != (prefix & 1):
                y = p - y

            # Construct the uncompressed key bytes (64 bytes: x || y)
            uncompressed = x.to_bytes(32, 'big') + y.to_bytes(32, 'big')
            vk = VerifyingKey.from_string(uncompressed, curve=SECP256k1)
        elif len(pubkey_bytes) == 65 and pubkey_bytes[0] == 0x04:
            # Uncompressed with 0x04 prefix
            vk = VerifyingKey.from_string(pubkey_bytes[1:], curve=SECP256k1)
        elif len(pubkey_bytes) == 64:
            # Raw uncompressed (no prefix)
            vk = VerifyingKey.from_string(pubkey_bytes, curve=SECP256k1)
        else:
            return False

        digest = sha256(msg)
        sig_bytes = bytes.fromhex(sig_hex)
        return vk.verify_digest(sig_bytes, digest, sigdecode=sigdecode_string)
    except Exception:
        return False
