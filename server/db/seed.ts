import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './index';
import { storageService } from '../services/storageService';
import { IUser, IFolder, IVaultFile, IFileVersion, IShare } from '../models';

export async function seedDemoDataIfEmpty() {
  try {
    const existingAlice = await db.findUserByEmail('alice@vaultbox.io');
    if (existingAlice) {
      return; // already seeded
    }

    console.log('[Seed] Seeding demo users and cryptographic files...');

    const saltAlice = 'a1b2c3d4e5f6789012345678abcdef01';
    const saltBob = 'b2c3d4e5f6789012345678abcdef01a1';
    const passwordHashAlice = await bcrypt.hash('Password123!#', 10);
    const passwordHashBob = await bcrypt.hash('Password123!#', 10);

    // Mock RSA keys for demo users
    const aliceUser: IUser = {
      id: 'usr_alice_demo_001',
      email: 'alice@vaultbox.io',
      username: 'alice',
      passwordHash: passwordHashAlice,
      salt: saltAlice,
      rsaPublicKey: JSON.stringify({
        kty: 'RSA',
        n: 'demo_rsa_public_n_alice_vaultbox_mock_sample_key_payload',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        ext: true,
      }),
      encryptedPrivateKey: 'demo_encrypted_rsa_private_key_alice_payload_base64',
      privateKeyIv: '1234567890ab',
      storageUsed: 24500,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const bobUser: IUser = {
      id: 'usr_bob_demo_002',
      email: 'bob@vaultbox.io',
      username: 'bob',
      passwordHash: passwordHashBob,
      salt: saltBob,
      rsaPublicKey: JSON.stringify({
        kty: 'RSA',
        n: 'demo_rsa_public_n_bob_vaultbox_mock_sample_key_payload',
        e: 'AQAB',
        alg: 'RSA-OAEP-256',
        ext: true,
      }),
      encryptedPrivateKey: 'demo_encrypted_rsa_private_key_bob_payload_base64',
      privateKeyIv: '0987654321ba',
      storageUsed: 0,
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createUser(aliceUser);
    await db.createUser(bobUser);

    // Create folders for Alice
    const financialFolder: IFolder = {
      id: 'fld_alice_fin_01',
      name: 'Confidential Finance',
      parentId: null,
      ownerId: aliceUser.id,
      color: '#10b981',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const keysFolder: IFolder = {
      id: 'fld_alice_keys_02',
      name: 'System Keys & Backups',
      parentId: null,
      ownerId: aliceUser.id,
      color: '#6366f1',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createFolder(financialFolder);
    await db.createFolder(keysFolder);

    // Create a sample encrypted blob on disk
    const sampleCiphertext = Buffer.from('VAULTBOX_ENCRYPTED_PAYLOAD_CIPHERTEXT_AES256GCM_DEMO_BLOB_' + crypto.randomBytes(512).toString('hex'));
    const { storageKey, size } = await storageService.saveEncryptedBlob(sampleCiphertext);

    const sampleFile: IVaultFile = {
      id: 'fil_demo_fin_01',
      name: 'Q3_Financial_Audit_Report.pdf',
      originalName: 'Q3_Financial_Audit_Report.pdf',
      mimeType: 'application/pdf',
      size,
      originalSize: size,
      folderId: financialFolder.id,
      ownerId: aliceUser.id,
      iv: 'dGVzdF9pdl8xMmJ5dGVz',
      wrappedKey: 'dGVzdF93cmFwcGVkX2tleV8zMmJ5dGVzX2FlczI1NmNpcGhlcg==',
      wrappedKeyIv: 'd3JhcF9pdl8xMmJ5dGVz',
      activeVersion: 1,
      storagePath: storageKey,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.createFile(sampleFile);
    await db.createFileVersion({
      id: 'ver_demo_fin_01_v1',
      fileId: sampleFile.id,
      versionNumber: 1,
      size,
      originalSize: size,
      iv: sampleFile.iv,
      wrappedKey: sampleFile.wrappedKey,
      wrappedKeyIv: sampleFile.wrappedKeyIv,
      storagePath: storageKey,
      createdBy: aliceUser.id,
      changeNote: 'Initial encrypted audit report upload',
      createdAt: sampleFile.createdAt,
    });

    // Create a share from Alice to Bob
    const sampleShare: IShare = {
      id: 'shr_demo_alice_bob_01',
      fileId: sampleFile.id,
      ownerId: aliceUser.id,
      recipientId: bobUser.id,
      recipientEmail: bobUser.email,
      wrappedKeyForRecipient: 'cnNhX3dyYXBwZWRfa2V5X2Zvcl9ib2JfZGVtbw==',
      permission: 'download',
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    };
    await db.createShare(sampleShare);

    // Create demo activity logs
    await db.logActivity({
      id: 'act_seed_01',
      userId: aliceUser.id,
      userName: aliceUser.username,
      userEmail: aliceUser.email,
      action: 'user_registered',
      targetType: 'user',
      targetId: aliceUser.id,
      targetName: 'alice',
      details: 'Registered account with PBKDF2 310,000-iter master key derivation.',
      createdAt: aliceUser.createdAt,
    });

    await db.logActivity({
      id: 'act_seed_02',
      userId: aliceUser.id,
      userName: aliceUser.username,
      userEmail: aliceUser.email,
      action: 'file_uploaded',
      targetType: 'file',
      targetId: sampleFile.id,
      targetName: sampleFile.name,
      details: `Encrypted in browser with AES-GCM (256-bit) and stored on disk (${Math.round(size / 1024)} KB).`,
      createdAt: sampleFile.createdAt,
    });

    await db.logActivity({
      id: 'act_seed_03',
      userId: aliceUser.id,
      userName: aliceUser.username,
      userEmail: aliceUser.email,
      action: 'file_shared',
      targetType: 'share',
      targetId: sampleFile.id,
      targetName: sampleFile.name,
      details: `Shared with bob@vaultbox.io via RSA-OAEP public key wrapping.`,
      createdAt: sampleShare.createdAt,
    });

    console.log('[Seed] Demo database initialized with Alice & Bob accounts.');
  } catch (err) {
    console.error('[Seed] Error seeding demo data:', err);
  }
}
