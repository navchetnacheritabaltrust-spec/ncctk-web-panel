import { TrsutData } from '@/lib/constentData'
import { Image, StyleSheet, View } from '@react-pdf/renderer'
import React from 'react'

const styles = StyleSheet.create({
          headerSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 7,
  },
  headerImg: {
    width: '100%',
    height: 110,
    objectFit: 'fill',
    },

})
const PdfHeaderCom = ({height}) => {

  return (
      <View style={styles.headerSection}>

        <Image src={TrsutData.headerImg} style={[styles.headerImg, { height:height?height:110 }]} />
</View>
  )
}

export default PdfHeaderCom