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
    # ecdsa lib expects uncompressed vk; reconstruct from compressed is non-trivial without extra math.
    # For node-side verification you will likely already store uncompressed pubkeys or use a library that supports compressed.
    # Here we keep client-side signing only; server-side verification should use coincurve/libsecp256k1.
    raise NotImplementedError('Use libsecp256k1/coincurve on the core node for verification of compressed pubkeys.')
